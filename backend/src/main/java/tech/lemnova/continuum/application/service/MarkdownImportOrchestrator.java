package tech.lemnova.continuum.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.application.exception.NotFoundException;
import tech.lemnova.continuum.application.exception.PlanLimitException;
import tech.lemnova.continuum.controller.dto.imp.ImportCommitRequest;
import tech.lemnova.continuum.controller.dto.imp.ImportCommitResponse;
import tech.lemnova.continuum.controller.dto.imp.ImportPreviewResponse;
import tech.lemnova.continuum.domain.entity.Entity;
import tech.lemnova.continuum.domain.entity.EntityType;
import tech.lemnova.continuum.domain.note.LinkType;
import tech.lemnova.continuum.domain.note.Note;
import tech.lemnova.continuum.domain.note.NoteLink;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.persistence.EntityRepository;
import tech.lemnova.continuum.infra.persistence.NoteLinkRepository;
import tech.lemnova.continuum.infra.persistence.NoteRepository;
import tech.lemnova.continuum.infra.security.CustomUserDetails;
import tech.lemnova.continuum.infra.vault.VaultStorageService;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
public class MarkdownImportOrchestrator {

    private final MarkdownImportService markdownService;
    private final EntityRepository entityRepo;
    private final NoteRepository noteRepo;
    private final NoteLinkRepository noteLinkRepo;
    private final UserRepository userRepo;
    private final UserService userService;
    private final PlanConfiguration planConfig;
    private final VaultStorageService storageService;

    public MarkdownImportOrchestrator(MarkdownImportService markdownService,
                                      EntityRepository entityRepo,
                                      NoteRepository noteRepo,
                                      NoteLinkRepository noteLinkRepo,
                                      UserRepository userRepo,
                                      UserService userService,
                                      PlanConfiguration planConfig,
                                      VaultStorageService storageService) {
        this.markdownService = markdownService;
        this.entityRepo = entityRepo;
        this.noteRepo = noteRepo;
        this.noteLinkRepo = noteLinkRepo;
        this.userRepo = userRepo;
        this.userService = userService;
        this.planConfig = planConfig;
        this.storageService = storageService;
    }

    public ImportPreviewResponse preview(List<ParsedUpload> files) {
        String userId = currentUserId();
        User user = userRepo.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        List<Entity> existing = entityRepo.findByUserIdAndArchivedAtIsNull(userId);
        Map<String, Entity> existingByKey = new HashMap<>();
        for (Entity e : existing) {
            if (e.getTitle() != null) existingByKey.put(e.getTitle().toLowerCase(Locale.ROOT).trim(), e);
        }

        List<ImportPreviewResponse.PreviewFile> previewFiles = new ArrayList<>();
        Map<String, ImportPreviewResponse.EntityCandidate> aggregated = new LinkedHashMap<>();
        List<String> errors = new ArrayList<>();

        for (ParsedUpload up : files) {
            try {
                MarkdownImportService.ParsedFile pf = markdownService.parse(up.filename(), up.content());
                previewFiles.add(new ImportPreviewResponse.PreviewFile(
                        pf.filename(), pf.title(), pf.content(),
                        new ArrayList<>(pf.candidateKeys()), pf.wordCount()
                ));
                for (MarkdownImportService.Candidate c : pf.candidates().values()) {
                    aggregated.merge(c.key(),
                            new ImportPreviewResponse.EntityCandidate(
                                    c.key(), c.name(), c.suggestedType(), c.occurrences(),
                                    existingByKey.containsKey(c.key())
                            ),
                            (a, b) -> new ImportPreviewResponse.EntityCandidate(
                                    a.key(), a.name(), a.suggestedType(),
                                    a.occurrences() + b.occurrences(), a.existing()
                            ));
                }
            } catch (Exception e) {
                log.warn("Failed to parse {}: {}", up.filename(), e.getMessage());
                errors.add(up.filename() + ": " + e.getMessage());
            }
        }
        return new ImportPreviewResponse(previewFiles, new ArrayList<>(aggregated.values()), errors);
    }

    public ImportCommitResponse commit(ImportCommitRequest req) {
        String userId = currentUserId();
        String vaultId = currentVaultId();
        User user = userRepo.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));

        if (req.files() == null || req.files().isEmpty()) {
            return new ImportCommitResponse(0, 0, 0, 0, List.of("No files provided"));
        }

        List<String> errors = new ArrayList<>();

        // 1) Resolve / create entities the user accepted.
        List<Entity> existing = entityRepo.findByUserIdAndArchivedAtIsNull(userId);
        Map<String, Entity> entityByKey = new HashMap<>();
        for (Entity e : existing) {
            if (e.getTitle() != null) entityByKey.put(e.getTitle().toLowerCase(Locale.ROOT).trim(), e);
        }

        int entitiesCreated = 0;
        int entitiesReused = 0;
        Map<String, Entity> acceptedByKey = new HashMap<>();
        if (req.entities() != null) {
            for (ImportCommitRequest.EntityDecision d : req.entities()) {
                if (d == null || !d.accept() || d.name() == null || d.name().isBlank()) continue;
                String key = (d.key() != null ? d.key() : d.name()).toLowerCase(Locale.ROOT).trim();
                Entity already = entityByKey.get(key);
                if (already != null) {
                    acceptedByKey.put(key, already);
                    entitiesReused++;
                    continue;
                }
                if (!planConfig.canCreateEntity(user.getPlan(), user.getEntityCount() + entitiesCreated)) {
                    errors.add("Entity limit reached, stopping at " + d.name());
                    break;
                }
                EntityType type;
                try { type = EntityType.fromValue(d.type() == null ? "TOPIC" : d.type()); }
                catch (Exception ex) { type = EntityType.TOPIC; }
                Entity created = Entity.builder()
                        .userId(userId)
                        .vaultId(vaultId)
                        .title(d.name().trim())
                        .type(type)
                        .createdAt(Instant.now())
                        .build();
                created = entityRepo.save(created);
                userService.incrementEntityCount(userId);
                entityByKey.put(key, created);
                acceptedByKey.put(key, created);
                entitiesCreated++;
            }
        }

        // 2) Create notes + links.
        int notesCreated = 0;
        int linksCreated = 0;
        long currentNoteCount = noteRepo.countByUserId(userId);

        for (ImportCommitRequest.CommitFile f : req.files()) {
            try {
                if (!planConfig.canCreateNote(user.getPlan(), currentNoteCount + notesCreated)) {
                    errors.add("Note limit reached, stopping at " + f.filename());
                    break;
                }
                JsonNode content = f.content();
                if (content == null || content.isNull()) {
                    errors.add(f.filename() + ": empty content");
                    continue;
                }
                String contentStr = content.toString();

                // Resolve entity IDs for this file from accepted candidates.
                List<String> entityIds = new ArrayList<>();
                if (f.candidateKeys() != null) {
                    for (String k : f.candidateKeys()) {
                        if (k == null) continue;
                        Entity e = acceptedByKey.get(k.toLowerCase(Locale.ROOT).trim());
                        if (e != null && !entityIds.contains(e.getId())) entityIds.add(e.getId());
                    }
                }

                String noteId = UUID.randomUUID().toString();
                String fileKey;
                try {
                    fileKey = storageService.saveNoteContent(vaultId, noteId, contentStr);
                } catch (Exception ex) {
                    log.warn("Vault save failed for {}: {}", f.filename(), ex.getMessage());
                    fileKey = null;
                }

                Note note = new Note();
                note.setId(noteId);
                note.setUserId(userId);
                note.setVaultId(vaultId);
                note.setTitle(safeTitle(f.title(), f.filename()));
                note.setContent(contentStr);
                note.setFileKey(fileKey);
                note.setEntityIds(entityIds);
                note.setCreatedAt(Instant.now());
                note.setUpdatedAt(Instant.now());
                noteRepo.save(note);

                for (String eid : entityIds) {
                    try {
                        NoteLink link = NoteLink.builder()
                                .sourceNoteId(noteId)
                                .targetNoteId(eid)
                                .userId(userId)
                                .vaultId(vaultId)
                                .linkType(LinkType.RELATED)
                                .context("import")
                                .createdAt(Instant.now())
                                .build();
                        noteLinkRepo.save(link);
                        linksCreated++;
                    } catch (Exception ex) {
                        log.warn("Failed to create link for {} → {}: {}", noteId, eid, ex.getMessage());
                    }
                }

                userService.incrementNoteCount(userId);
                notesCreated++;
            } catch (PlanLimitException ple) {
                errors.add(f.filename() + ": " + ple.getMessage());
                break;
            } catch (Exception ex) {
                log.warn("Failed to import {}: {}", f.filename(), ex.getMessage());
                errors.add(f.filename() + ": " + ex.getMessage());
            }
        }

        return new ImportCommitResponse(notesCreated, entitiesCreated, entitiesReused, linksCreated, errors);
    }

    private String safeTitle(String title, String filename) {
        if (title != null && !title.isBlank()) return title.trim();
        return filename == null ? "Untitled" : filename;
    }

    private String currentUserId() {
        Object p = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (p instanceof CustomUserDetails u) return u.getUserId();
        throw new IllegalStateException("Authenticated user not found");
    }

    private String currentVaultId() {
        Object p = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (p instanceof CustomUserDetails u) return u.getVaultId();
        throw new IllegalStateException("Authenticated user not found");
    }

    public record ParsedUpload(String filename, String content) {}
}