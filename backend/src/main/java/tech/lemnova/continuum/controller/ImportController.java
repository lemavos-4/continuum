package tech.lemnova.continuum.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tech.lemnova.continuum.application.service.MarkdownImportOrchestrator;
import tech.lemnova.continuum.application.service.MarkdownImportOrchestrator.ParsedUpload;
import tech.lemnova.continuum.controller.dto.imp.ImportCommitRequest;
import tech.lemnova.continuum.controller.dto.imp.ImportCommitResponse;
import tech.lemnova.continuum.controller.dto.imp.ImportPreviewResponse;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/import")
@Tag(name = "Import", description = "Bulk import of external content into Continuum")
public class ImportController {

    private static final int MAX_FILES = 200;
    private static final long MAX_BYTES_PER_FILE = 2 * 1024 * 1024L; // 2MB per file
    private static final long MAX_TOTAL_BYTES = 25 * 1024 * 1024L;   // 25MB total

    private final MarkdownImportOrchestrator orchestrator;

    public ImportController(MarkdownImportOrchestrator orchestrator) {
        this.orchestrator = orchestrator;
    }

    @PostMapping(value = "/markdown/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Preview a Markdown import", description = "Parses .md files, returns Tiptap content and detected entity candidates without persisting.")
    public ResponseEntity<ImportPreviewResponse> preview(@RequestParam("files") MultipartFile[] files) throws Exception {
        if (files == null || files.length == 0) {
            return ResponseEntity.badRequest().build();
        }
        if (files.length > MAX_FILES) {
            return ResponseEntity.badRequest().build();
        }

        long total = 0;
        List<ParsedUpload> uploads = new ArrayList<>();
        for (MultipartFile f : files) {
            if (f == null || f.isEmpty()) continue;
            String name = f.getOriginalFilename() == null ? "untitled.md" : f.getOriginalFilename();
            // Strip directory path to compare just the basename.
            int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
            String base = slash >= 0 ? name.substring(slash + 1) : name;
            String lower = base.toLowerCase();
            // Only accept plain `.md` files. Reject every other extension
            // (.markdown, .txt, .png, .jpg, .mp3, .pdf, .json, .html…) as well as
            // hidden files (`.DS_Store`, `.obsidian/…`) and dotfiles that may
            // sneak in through a folder upload. They pollute entity detection
            // and bloat the payload.
            if (base.startsWith(".")) continue;
            if (!lower.endsWith(".md")) continue;
            if (f.getSize() > MAX_BYTES_PER_FILE) continue;
            total += f.getSize();
            if (total > MAX_TOTAL_BYTES) break;
            uploads.add(new ParsedUpload(name, new String(f.getBytes(), StandardCharsets.UTF_8)));
        }
        return ResponseEntity.ok(orchestrator.preview(uploads));
    }

    @PostMapping(value = "/markdown/commit", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Commit a Markdown import", description = "Persists notes, creates accepted entities, and links them based on user-approved decisions.")
    public ResponseEntity<ImportCommitResponse> commit(@RequestBody ImportCommitRequest req) {
        return ResponseEntity.ok(orchestrator.commit(req));
    }
}