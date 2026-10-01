package tech.lemnova.continuum.controller.dto.metrics;

import java.time.LocalDate;

public record MentionEntry(String noteId, String noteTitle, LocalDate date, String context) {}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────
