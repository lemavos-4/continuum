package tech.lemnova.continuum.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.domain.connection.NoteReference;
import tech.lemnova.continuum.infra.vault.VaultDataService;
import tech.lemnova.continuum.infra.vault.VaultStorageService;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class EntityIndexService {

    private static final Logger log = LoggerFactory.getLogger(EntityIndexService.class);

    private final VaultDataService vaultData;
    private final VaultStorageService vault;
    private final ObjectMapper mapper;

    public EntityIndexService(VaultDataService vaultData, VaultStorageService vault) {
        this.vaultData = vaultData;
        this.vault     = vault;
        this.mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * [BUG-1 FIX] Reconstrói entity_index.json lendo os refs do vault B2.
     * Chamado de forma assíncrona após qualquer operação em notas.
     */
    @Async
    public void rebuildIndex(String vaultId) {
        try {
            List<NoteReference> allRefs = vaultData.readRefs(vaultId);

            Map<String, List<NoteReference>> byEntity = allRefs.stream()
                    .collect(Collectors.groupingBy(NoteReference::getEntityId));

            ObjectNode root     = mapper.createObjectNode();
            ObjectNode entities = root.putObject("entities");

            byEntity.forEach((entityId, refs) -> {
                // compute using LocalDate from note references
                java.time.LocalDate firstDate = refs.stream()
                        .map(NoteReference::getDate)
                        .filter(java.util.Objects::nonNull)
                        .min(java.time.LocalDate::compareTo)
                        .orElse(java.time.LocalDate.now());
                java.time.LocalDate lastDate = refs.stream()
                        .map(NoteReference::getDate)
                        .filter(java.util.Objects::nonNull)
                        .max(java.time.LocalDate::compareTo)
                        .orElse(java.time.LocalDate.now());

                long total = refs.size();
                long days = java.time.temporal.ChronoUnit.DAYS.between(firstDate, java.time.LocalDate.now()) + 1;
                double freq = days <= 0 ? 0.0 : ((double) total) / days;

                Instant first = firstDate.atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
                Instant last = lastDate.atStartOfDay(java.time.ZoneOffset.UTC).toInstant();

                ObjectNode entry = entities.putObject(entityId);
                entry.put("type",              refs.get(0).getEntityType().name());
                entry.put("name",              refs.get(0).getEntityName());
                entry.put("mentions",          total);
                entry.put("firstMentionedAt",  first.toString());
                entry.put("lastMentionedAt",   last.toString());
                entry.put("mentionFrequency", freq);
            });

            root.put("updatedAt", Instant.now().toString());
            vault.saveEntityIndex(vaultId, mapper.writeValueAsString(root));
            log.debug("[EntityIndex] Rebuilt for vault {} — {} entities", vaultId, byEntity.size());
        } catch (Exception e) {
            log.error("[EntityIndex] Failed to rebuild for vault {}: {}", vaultId, e.getMessage(), e);
        }
    }

    public String loadIndex(String vaultId) {
        return vault.loadEntityIndex(vaultId)
                .orElse("{\"entities\":{},\"updatedAt\":null}");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION — NoteService [BUG-1][ARCH-1][ARCH-2][V11-ARCH]
// Persistência de NoteIndex, NoteReference → vault B2 via VaultDataService.
// ─────────────────────────────────────────────────────────────────────────────
