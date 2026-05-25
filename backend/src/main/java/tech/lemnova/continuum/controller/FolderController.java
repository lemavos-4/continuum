package tech.lemnova.continuum.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.lemnova.continuum.application.exception.BadRequestException;
import tech.lemnova.continuum.application.service.FolderService;
import tech.lemnova.continuum.controller.dto.folder.FolderCreateRequest;
import tech.lemnova.continuum.domain.folder.Folder;
import tech.lemnova.continuum.infra.security.CustomUserDetails;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) { this.folderService = folderService; }

    @PostMapping
    public ResponseEntity<Folder> create(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody FolderCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(folderService.create(user.getUserId(), req));
    }

    @GetMapping
    public ResponseEntity<List<Folder>> list(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(folderService.listAll(user.getUserId()));
    }

    @PatchMapping("/{id}/rename")
    public ResponseEntity<Folder> rename(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) throw new BadRequestException("name is required");
        return ResponseEntity.ok(folderService.rename(user.getUserId(), id, name));
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<Folder> move(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(folderService.move(user.getUserId(), id, body.get("parentId")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable String id) {
        folderService.delete(user.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
