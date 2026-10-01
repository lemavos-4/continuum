package tech.lemnova.continuum.application.service;

import org.springframework.stereotype.Service;
import tech.lemnova.continuum.application.exception.BadRequestException;
import tech.lemnova.continuum.application.exception.NotFoundException;
import tech.lemnova.continuum.controller.dto.folder.FolderCreateRequest;
import tech.lemnova.continuum.domain.folder.Folder;
import tech.lemnova.continuum.domain.note.NoteIndex;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.vault.VaultDataService;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FolderService {

    private final UserRepository userRepo;
    private final VaultDataService vaultData;

    public FolderService(UserRepository userRepo, VaultDataService vaultData) {
        this.userRepo  = userRepo;
        this.vaultData = vaultData;
    }

    public Folder create(String userId, FolderCreateRequest req) {
        User user = getUser(userId);
        List<Folder> folders = vaultData.readFolders(user.getVaultId());

        if (req.parentId() != null) {
            folders.stream().filter(f -> f.getId().equals(req.parentId()) && f.getUserId().equals(userId))
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException("Parent folder not found: " + req.parentId()));
        }

        Folder folder = new Folder();
        folder.setId(UUID.randomUUID().toString().replace("-", ""));
        folder.setUserId(userId);
        folder.setName(req.name().trim());
        folder.setParentId(req.parentId());
        folder.setCreatedAt(Instant.now());
        folder.setUpdatedAt(Instant.now());

        folders.add(folder);
        vaultData.writeFolders(user.getVaultId(), folders);
        return folder;
    }

    public List<Folder> listAll(String userId) {
        User user = getUser(userId);
        return vaultData.readFolders(user.getVaultId()).stream()
                .filter(f -> f.getUserId().equals(userId))
                .sorted(Comparator.comparing(Folder::getName))
                .collect(Collectors.toList());
    }

    public Folder rename(String userId, String folderId, String newName) {
        User user = getUser(userId);
        List<Folder> folders = vaultData.readFolders(user.getVaultId());
        Folder folder = getFolder(folders, userId, folderId);
        folder.setName(newName.trim());
        folder.setUpdatedAt(Instant.now());
        vaultData.writeFolders(user.getVaultId(), folders);
        return folder;
    }

    public Folder move(String userId, String folderId, String newParentId) {
        User user = getUser(userId);
        List<Folder> folders = vaultData.readFolders(user.getVaultId());
        Folder folder = getFolder(folders, userId, folderId);

        if (newParentId != null) {
            folders.stream().filter(f -> f.getId().equals(newParentId) && f.getUserId().equals(userId))
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException("Target folder not found: " + newParentId));
            if (wouldCreateCycle(folders, folderId, newParentId))
                throw new BadRequestException("Cannot move a folder into its own descendant");
        }

        folder.setParentId(newParentId);
        folder.setUpdatedAt(Instant.now());
        vaultData.writeFolders(user.getVaultId(), folders);
        return folder;
    }

    public void delete(String userId, String folderId) {
        User user = getUser(userId);
        List<Folder> folders = vaultData.readFolders(user.getVaultId());
        getFolder(folders, userId, folderId); // valida que existe

        // [ARCH-7] Limpa folderId de TODAS as notas da pasta (ativas E arquivadas)
        List<NoteIndex> allNoteIndexes = vaultData.readNoteIndex(user.getVaultId());
        allNoteIndexes.stream()
                .filter(n -> folderId.equals(n.getFolderId()))
                .forEach(n -> {
                    n.setFolderId(null);
                    // Só atualiza updatedAt de notas ativas
                    if (n.getArchivedAt() == null) n.setUpdatedAt(Instant.now());
                });
        vaultData.writeNoteIndex(user.getVaultId(), allNoteIndexes);

        // Deleta subpastas recursivamente
        Set<String> toDelete = collectDescendants(folders, folderId);
        toDelete.add(folderId);
        folders.removeIf(f -> toDelete.contains(f.getId()));
        vaultData.writeFolders(user.getVaultId(), folders);
    }

    // ── private ───────────────────────────────────────────────────────────────

    private Folder getFolder(List<Folder> folders, String userId, String folderId) {
        return folders.stream()
                .filter(f -> f.getId().equals(folderId) && f.getUserId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Folder not found: " + folderId));
    }

    private boolean wouldCreateCycle(List<Folder> folders, String folderId, String targetParentId) {
        return collectDescendants(folders, folderId).contains(targetParentId);
    }

    private Set<String> collectDescendants(List<Folder> folders, String folderId) {
        Set<String> result = new HashSet<>();
        Queue<String> queue = new ArrayDeque<>();
        queue.add(folderId);
        while (!queue.isEmpty()) {
            String current = queue.poll();
            folders.stream()
                    .filter(f -> current.equals(f.getParentId()))
                    .forEach(f -> {
                        result.add(f.getId());
                        queue.add(f.getId());
                    });
        }
        return result;
    }

    private User getUser(String userId) {
        return userRepo.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION — TrackingService [V11-ARCH]
// TrackingEvents persistidos em _tracking/events.json no vault B2.
// ─────────────────────────────────────────────────────────────────────────────
