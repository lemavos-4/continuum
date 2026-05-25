package tech.lemnova.continuum.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.lemnova.continuum.application.service.InsightsService;
import tech.lemnova.continuum.controller.dto.insights.EntityInsightDTO;
import tech.lemnova.continuum.controller.dto.insights.NoteInsightDTO;

import java.util.List;

/**
 * InsightsController — endpoints para descoberta de notas/entidades importantes.
 *
 * Resolve o problema do "graveyard of notes":
 *  • Hot Notes / Hot Entities → o que está em alta agora
 *  • Forgotten Notes / Forgotten Entities → "joias" antigas com alto valor histórico
 */
@RestController
@RequestMapping("/api/insights")
@Tag(name = "Insights", description = "Importance scoring and discovery of notes/entities worth revisiting")
public class InsightsController {

    private final InsightsService insightsService;

    public InsightsController(InsightsService insightsService) {
        this.insightsService = insightsService;
    }

    @GetMapping("/notes/hot")
    @Operation(summary = "Top important notes (Hot Notes)")
    public ResponseEntity<List<NoteInsightDTO>> hotNotes(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(insightsService.hotNotes(limit));
    }

    @GetMapping("/notes/forgotten")
    @Operation(summary = "Important but forgotten notes (high historical score + stale)")
    public ResponseEntity<List<NoteInsightDTO>> forgottenNotes(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(insightsService.forgottenNotes(limit));
    }

    @GetMapping("/entities/hot")
    @Operation(summary = "Key entities (Hot Entities)")
    public ResponseEntity<List<EntityInsightDTO>> hotEntities(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(insightsService.hotEntities(limit));
    }

    @GetMapping("/entities/forgotten")
    @Operation(summary = "Important but forgotten entities")
    public ResponseEntity<List<EntityInsightDTO>> forgottenEntities(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(insightsService.forgottenEntities(limit));
    }
}
