package tech.lemnova.continuum.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

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
    private final ObjectMapper jsonMapper = new ObjectMapper();
    private static final Pattern BLOCKED_ENTITY_FILE_EXT = Pattern.compile(
            "(?i).+\\.(png|jpe?g|gif|webp|svg|bmp|tiff?|heic|mp3|wav|m4a|ogg|opus|flac|aac|mp4|mov|webm|avi|mkv|pdf|docx?|xlsx?|pptx?|csv|tsv|zip|rar|7z|tar|gz|exe|dmg|apk|html?|css|js|ts|tsx|jsx|json|xml|yaml|yml)$"
    );

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
            if (e.getTitle() != null) existingByKey.put(normalizeEntityKey(e.getTitle()), e);
        }

        // Existing note titles for dedup against the DB.
        Set<String> existingNoteTitles = new HashSet<>();
        for (Note n : noteRepo.findByUserId(userId)) {
            if (n.getTitle() != null) existingNoteTitles.add(n.getTitle().toLowerCase(Locale.ROOT).trim());
        }

        List<ImportPreviewResponse.PreviewFile> previewFiles = new ArrayList<>();
        Map<String, ImportPreviewResponse.EntityCandidate> aggregated = new LinkedHashMap<>();
        List<String> errors = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        Set<String> seenHashes = new HashSet<>();
        Set<String> seenTitlesInBatch = new HashSet<>();
        Set<String> seenFilenames = new HashSet<>();

        // Parse in parallel (each call may hit Gemini Flash ~1s).
        record Parsed(ParsedUpload upload, MarkdownImportService.ParsedFile pf, Exception error) {}
        ForkJoinPool pool = new ForkJoinPool(Math.min(8, Math.max(2, files.size())));
        List<Parsed> parsed;
        try {
            parsed = pool.submit(() ->
                    files.parallelStream().map(up -> {
                        try {
                            return new Parsed(up, markdownService.parse(up.filename(), up.content()), null);
                        } catch (Exception ex) {
                            return new Parsed(up, null, ex);
                        }
                    }).collect(Collectors.toList())
            ).get(5, TimeUnit.MINUTES);
        } catch (Exception ex) {
            errors.add("Parsing batch failed: " + ex.getMessage());
            parsed = List.of();
        } finally {
            pool.shutdown();
        }

        for (Parsed p : parsed) {
            ParsedUpload up = p.upload();
            if (p.error() != null) {
                log.warn("Failed to parse {}: {}", up.filename(), p.error().getMessage());
                errors.add(up.filename() + ": " + p.error().getMessage());
                continue;
            }
            try {
                String baseName = baseName(up.filename());
                if (!seenFilenames.add(baseName.toLowerCase(Locale.ROOT))) {
                    skipped.add(up.filename() + ": duplicate filename in upload");
                    continue;
                }
                MarkdownImportService.ParsedFile pf = p.pf();
                String titleKey = pf.title() == null ? "" : pf.title().toLowerCase(Locale.ROOT).trim();
                if (!pf.hasBody()) {
                    skipped.add(up.filename() + ": empty content");
                    continue;
                }
                if (!seenHashes.add(pf.contentHash())) {
                    skipped.add(up.filename() + ": duplicate content in upload");
                    continue;
                }
                if (!seenTitlesInBatch.add(titleKey)) {
                    skipped.add(up.filename() + ": duplicate title in upload (" + pf.title() + ")");
                    continue;
                }
                if (existingNoteTitles.contains(titleKey)) {
                    skipped.add(up.filename() + ": note already exists (" + pf.title() + ")");
                    continue;
                }
                previewFiles.add(new ImportPreviewResponse.PreviewFile(
                        pf.filename(), pf.title(), pf.content(),
                        new ArrayList<>(pf.candidateKeys()), pf.wordCount()
                ));
                for (MarkdownImportService.Candidate c : pf.candidates().values()) {
                    aggregated.merge(c.key(),
                            new ImportPreviewResponse.EntityCandidate(
                                    c.key(), c.name(), c.suggestedType(), c.occurrences(),
                                    existingByKey.containsKey(normalizeEntityKey(c.key())), c.confidence()
                            ),
                            (a, b) -> new ImportPreviewResponse.EntityCandidate(
                                    a.key(), a.name(), a.suggestedType(),
                                    a.occurrences() + b.occurrences(), a.existing(),
                                    mergeConfidence(a.confidence(), b.confidence())
                            ));
                }
            } catch (Exception e) {
                log.warn("Failed to parse {}: {}", up.filename(), e.getMessage());
                errors.add(up.filename() + ": " + e.getMessage());
            }
        }
        return new ImportPreviewResponse(previewFiles, new ArrayList<>(aggregated.values()), errors, skipped);
    }

    private static String mergeConfidence(String a, String b) {
        if ("HIGH".equals(a) || "HIGH".equals(b)) return "HIGH";
        if ("MEDIUM".equals(a) || "MEDIUM".equals(b)) return "MEDIUM";
        return "LOW";
    }

    private String baseName(String path) {
        if (path == null) return "";
        int slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        return slash >= 0 ? path.substring(slash + 1) : path;
    }

    public ImportCommitResponse commit(ImportCommitRequest req) {
        String userId = currentUserId();
        String vaultId = currentVaultId();
        User user = userRepo.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));

        if (req.files() == null || req.files().isEmpty()) {
            return new ImportCommitResponse(0, 0, 0, 0, List.of("No files provided"));
        }

        List<String> errors = new ArrayList<>();

        // Build dedup set from existing notes (defense-in-depth — preview already filtered).
        Set<String> existingNoteTitles = new HashSet<>();
        for (Note n : noteRepo.findByUserId(userId)) {
            if (n.getTitle() != null) existingNoteTitles.add(n.getTitle().toLowerCase(Locale.ROOT).trim());
        }
        Set<String> committedTitles = new HashSet<>();

        // 1) Resolve / create entities the user accepted.
        List<Entity> existing = entityRepo.findByUserIdAndArchivedAtIsNull(userId);
        Map<String, Entity> entityByKey = new HashMap<>();
        for (Entity e : existing) {
            if (e.getTitle() != null) entityByKey.put(normalizeEntityKey(e.getTitle()), e);
        }

        int entitiesCreated = 0;
        int entitiesReused = 0;
        Map<String, Entity> acceptedByKey = new HashMap<>();
        if (req.entities() != null) {
            for (ImportCommitRequest.EntityDecision d : req.entities()) {
                if (d == null || !d.accept() || d.name() == null || d.name().isBlank()) continue;
                String candidateKey = normalizeEntityKey(d.key() != null ? d.key() : d.name());
                String entityKey = normalizeEntityKey(d.name());
                Entity already = entityByKey.get(entityKey);
                if (already != null) {
                    acceptedByKey.put(candidateKey, already);
                    entitiesReused++;
                    continue;
                }
                if (!planConfig.canCreateEntity(user.getPlan(), user.getEntityCount() + entitiesCreated)) {
                    errors.add("Entity limit reached, stopping at " + d.name());
                    break;
                }
                Entity created = Entity.builder()
                        .userId(userId)
                        .vaultId(vaultId)
                        .title(d.name().trim())
                        .type(parseEntityType(d.type()))
                        .createdAt(Instant.now())
                        .build();
                created = entityRepo.save(created);
                userService.incrementEntityCount(userId);
                entityByKey.put(entityKey, created);
                acceptedByKey.put(candidateKey, created);
                entitiesCreated++;
            }
        }

        // 1b) User-supplied custom entities. First scan the imported notes; only
        //     create/reuse manual entities that actually appear in the batch.
        Map<String, Entity> customByKey = new LinkedHashMap<>();
        record CustomSpec(String key, String name, EntityType type) {}
        Map<String, CustomSpec> customSpecs = new LinkedHashMap<>();
        if (req.customEntities() != null) {
            for (ImportCommitRequest.CustomEntity ce : req.customEntities()) {
                if (ce == null || ce.name() == null || ce.name().isBlank()) continue;
                String name = cleanManualEntityName(ce.name());
                if (isUnsafeManualEntityName(name)) continue;
                String key = normalizeEntityKey(name);
                if (customSpecs.containsKey(key)) continue;
                customSpecs.put(key, new CustomSpec(key, name, parseEntityType(ce.type())));
            }
        }
        if (!customSpecs.isEmpty()) {
            Set<String> matchedCustomKeys = new LinkedHashSet<>();
            for (ImportCommitRequest.CommitFile f : req.files()) {
                if (f == null || f.content() == null || f.content().isNull()) continue;
                String plain = normalizeSearchText(extractPlainFromTiptap(f.content()));
                for (CustomSpec spec : customSpecs.values()) {
                    if (findWordBoundary(plain, spec.key()) >= 0) matchedCustomKeys.add(spec.key());
                }
            }
            for (CustomSpec spec : customSpecs.values()) {
                String key = spec.key();
                String name = spec.name();
                if (!matchedCustomKeys.contains(key)) {
                    errors.add("Manual entity not found in imported notes: " + name);
                    continue;
                }
                Entity already = entityByKey.get(key);
                if (already != null) {
                    customByKey.put(key, already);
                    if (!acceptedByKey.containsKey(key)) entitiesReused++;
                    continue;
                }
                if (!planConfig.canCreateEntity(user.getPlan(), user.getEntityCount() + entitiesCreated)) {
                    errors.add("Entity limit reached, stopping at " + name);
                    break;
                }
                Entity created = Entity.builder()
                        .userId(userId)
                        .vaultId(vaultId)
                        .title(name)
                        .type(spec.type())
                        .createdAt(Instant.now())
                        .build();
                created = entityRepo.save(created);
                userService.incrementEntityCount(userId);
                entityByKey.put(key, created);
                customByKey.put(key, created);
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
                String safeTitle = safeTitle(f.title(), f.filename());
                String titleKey = safeTitle.toLowerCase(Locale.ROOT).trim();
                if (existingNoteTitles.contains(titleKey) || !committedTitles.add(titleKey)) {
                    errors.add(f.filename() + ": skipped duplicate (" + safeTitle + ")");
                    continue;
                }
                // Resolve entity IDs for this file from accepted candidates.
                List<String> entityIds = new ArrayList<>();
                Map<String, tech.lemnova.continuum.domain.entity.Entity> mentionByName = new LinkedHashMap<>();
                if (f.candidateKeys() != null) {
                    for (String k : f.candidateKeys()) {
                        if (k == null) continue;
                        Entity e = acceptedByKey.get(normalizeEntityKey(k));
                        if (e != null) {
                            if (!entityIds.contains(e.getId())) entityIds.add(e.getId());
                            mentionByName.putIfAbsent(normalizeEntityKey(e.getTitle()), e);
                        }
                    }
                }

                // Scan the note for any user-supplied custom entities and link them
                // whenever their name appears (case-insensitive, word boundary).
                if (!customByKey.isEmpty()) {
                    String plain = normalizeSearchText(extractPlainFromTiptap(content));
                    for (Map.Entry<String, Entity> ce : customByKey.entrySet()) {
                        if (findWordBoundary(plain, ce.getKey()) >= 0) {
                            Entity e = ce.getValue();
                            if (!entityIds.contains(e.getId())) entityIds.add(e.getId());
                            mentionByName.putIfAbsent(normalizeEntityKey(e.getTitle()), e);
                        }
                    }
                }

                // Rewrite Tiptap content: replace plain-text occurrences of accepted
                // entity names with proper @mention nodes so they show as links.
                JsonNode rewritten = mentionByName.isEmpty()
                        ? content
                        : applyMentions(content, mentionByName);
                String contentStr = rewritten.toString();

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
                note.setTitle(safeTitle);
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

    private EntityType parseEntityType(String value) {
        try { return EntityType.fromValue(value == null ? "TOPIC" : value); }
        catch (Exception ex) { return EntityType.TOPIC; }
    }

    private String cleanManualEntityName(String raw) {
        return raw == null ? "" : raw.trim().replaceAll("\\s+", " ");
    }

    private boolean isUnsafeManualEntityName(String name) {
        if (name == null || name.length() < 2 || name.length() > 80) return true;
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.contains("/") || lower.contains("\\") || lower.contains("://")
                || lower.startsWith("www.") || BLOCKED_ENTITY_FILE_EXT.matcher(lower).matches();
    }

    private String normalizeEntityKey(String value) {
        return normalizeSearchText(value).trim().replaceAll("\\s+", " ");
    }

    private String normalizeSearchText(String value) {
        if (value == null) return "";
        return java.text.Normalizer.normalize(value.toLowerCase(Locale.ROOT), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
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

    // ─────────────────────────────────────────────────────────────────────
    // Tiptap mention rewriting
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Walks the Tiptap doc and replaces literal text matches of entity names
     * inside text nodes with mention nodes ({type:"mention", attrs:{id,label}}).
     * Case-insensitive, word-boundary aware. User-approved/manual entities are
     * linked on every exact occurrence so the imported note is immediately usable.
     */
    private JsonNode applyMentions(JsonNode doc, Map<String, Entity> mentionByName) {
        if (doc == null || !(doc instanceof ObjectNode)) return doc;
        Set<String> alreadyLinked = new HashSet<>();
        ObjectNode copy = doc.deepCopy();
        walkAndLink(copy, mentionByName, alreadyLinked);
        return copy;
    }

    private void walkAndLink(JsonNode node, Map<String, Entity> mentionByName, Set<String> alreadyLinked) {
        if (node == null) return;
        if (node.isObject() && "text".equals(node.path("type").asText())) {
            // Handled by parent (we need to splice siblings).
            return;
        }
        JsonNode contentNode = node.path("content");
        if (contentNode.isArray()) {
            ArrayNode arr = (ArrayNode) contentNode;
            ArrayNode rebuilt = jsonMapper.createArrayNode();
            for (JsonNode child : arr) {
                if (child.isObject() && "text".equals(child.path("type").asText())) {
                    splitTextWithMentions((ObjectNode) child, mentionByName, alreadyLinked, rebuilt);
                } else {
                    walkAndLink(child, mentionByName, alreadyLinked);
                    rebuilt.add(child);
                }
            }
            ((ObjectNode) node).set("content", rebuilt);
        }
    }

    private void splitTextWithMentions(ObjectNode textNode, Map<String, Entity> mentionByName,
                                       Set<String> alreadyLinked, ArrayNode out) {
        String text = textNode.path("text").asText("");
        if (text.isEmpty()) { out.add(textNode); return; }
        JsonNode marks = textNode.get("marks");
        // If text has marks, skip rewriting — keep formatting intact.
        if (marks != null && marks.isArray() && marks.size() > 0) { out.add(textNode); return; }

        String lower = text.toLowerCase(Locale.ROOT);
        // Find earliest match among remaining entities.
        int bestStart = -1, bestLen = 0;
        Entity bestEntity = null;
        for (Map.Entry<String, Entity> e : mentionByName.entrySet()) {
            String name = e.getValue().getTitle();
            if (name == null || name.length() < 2) continue;
            int idx = findWordBoundary(lower, name.toLowerCase(Locale.ROOT));
            if (idx >= 0 && (bestStart < 0 || idx < bestStart || (idx == bestStart && name.length() > bestLen))) {
                bestStart = idx;
                bestLen = name.length();
                bestEntity = e.getValue();
            }
        }
        if (bestStart < 0 || bestEntity == null) {
            out.add(textNode);
            return;
        }
        // Pre-text
        if (bestStart > 0) {
            ObjectNode before = jsonMapper.createObjectNode();
            before.put("type", "text");
            before.put("text", text.substring(0, bestStart));
            out.add(before);
        }
        // Mention
        ObjectNode mention = jsonMapper.createObjectNode();
        mention.put("type", "mention");
        ObjectNode attrs = jsonMapper.createObjectNode();
        attrs.put("id", bestEntity.getId());
        attrs.put("label", bestEntity.getTitle());
        mention.set("attrs", attrs);
        out.add(mention);

        // Recurse on tail to catch other entities.
        String tail = text.substring(bestStart + bestLen);
        if (!tail.isEmpty()) {
            ObjectNode tailNode = jsonMapper.createObjectNode();
            tailNode.put("type", "text");
            tailNode.put("text", tail);
            splitTextWithMentions(tailNode, mentionByName, alreadyLinked, out);
        }
    }

    private int findWordBoundary(String haystack, String needle) {
        int from = 0;
        while (from <= haystack.length() - needle.length()) {
            int idx = haystack.indexOf(needle, from);
            if (idx < 0) return -1;
            boolean leftOk = idx == 0 || !Character.isLetterOrDigit(haystack.charAt(idx - 1));
            int end = idx + needle.length();
            boolean rightOk = end == haystack.length() || !Character.isLetterOrDigit(haystack.charAt(end));
            if (leftOk && rightOk) return idx;
            from = idx + 1;
        }
        return -1;
    }

    /** Concatenates all text node values inside a Tiptap doc. */
    private String extractPlainFromTiptap(JsonNode doc) {
        StringBuilder sb = new StringBuilder();
        collectText(doc, sb);
        return sb.toString();
    }

    private void collectText(JsonNode node, StringBuilder sb) {
        if (node == null) return;
        if (node.isObject()) {
            if ("text".equals(node.path("type").asText())) {
                sb.append(node.path("text").asText("")).append(' ');
                return;
            }
            JsonNode content = node.path("content");
            if (content.isArray()) {
                for (JsonNode c : content) collectText(c, sb);
            }
        } else if (node.isArray()) {
            for (JsonNode c : node) collectText(c, sb);
        }
    }
}