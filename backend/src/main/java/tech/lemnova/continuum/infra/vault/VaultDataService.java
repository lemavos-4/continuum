package tech.lemnova.continuum.infra.vault;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.domain.connection.NoteReference;
import tech.lemnova.continuum.domain.entity.Entity;
import tech.lemnova.continuum.domain.folder.Folder;
import tech.lemnova.continuum.domain.note.NoteIndex;
import tech.lemnova.continuum.domain.tracking.TrackingEvent;

import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.databind.DeserializationFeature;

/**
 * Camada de acesso tipado ao vault B2.
 * Serializa/deserializa POJOs para JSON e delega ao VaultStorageService.
 */
@Service
public class VaultDataService {

    private static final Logger log = LoggerFactory.getLogger(VaultDataService.class);

    private final VaultStorageService storage;
    private final ObjectMapper mapper;

    public VaultDataService(VaultStorageService storage) {
        this.storage = storage;
        this.mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    // ── NoteIndex ─────────────────────────────────────────────────────────────

    public List<NoteIndex> readNoteIndex(String vaultId) {
        return read(storage.loadNoteIndex(vaultId), new TypeReference<>() {});
    }

    public void writeNoteIndex(String vaultId, List<NoteIndex> index) {
        write(vaultId, index, storage::saveNoteIndex);
    }

    // ── Entities ─────────────────────────────────────────────────────────────

    public List<Entity> readEntities(String vaultId) {
        return read(storage.loadEntities(vaultId), new TypeReference<>() {});
    }

    public void writeEntities(String vaultId, List<Entity> entities) {
        write(vaultId, entities, storage::saveEntities);
    }

    // ── Folders ──────────────────────────────────────────────────────────────

    public List<Folder> readFolders(String vaultId) {
        return read(storage.loadFolders(vaultId), new TypeReference<>() {});
    }

    public void writeFolders(String vaultId, List<Folder> folders) {
        write(vaultId, folders, storage::saveFolders);
    }

    // ── TrackingEvents ────────────────────────────────────────────────────────

    public List<TrackingEvent> readTrackingEvents(String vaultId) {
        return read(storage.loadTrackingEvents(vaultId), new TypeReference<>() {});
    }

    public void writeTrackingEvents(String vaultId, List<TrackingEvent> events) {
        write(vaultId, events, storage::saveTrackingEvents);
    }

    // ── NoteReferences ────────────────────────────────────────────────────────

    public List<NoteReference> readRefs(String vaultId) {
        return read(storage.loadRefs(vaultId), new TypeReference<>() {});
    }

    public void writeRefs(String vaultId, List<NoteReference> refs) {
        write(vaultId, refs, storage::saveRefs);
    }

    // ── private helpers ───────────────────────────────────────────────────────

    private <T> List<T> read(java.util.Optional<String> json, TypeReference<List<T>> ref) {
        if (json.isEmpty() || json.get().isBlank() || json.get().equals("[]")) return new ArrayList<>();
        try {
            return mapper.readValue(json.get(), ref);
        } catch (Exception e) {
            log.error("Failed to deserialize vault data: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    private <T> void write(String vaultId, List<T> data, java.util.function.BiConsumer<String, String> saver) {
        try {
            saver.accept(vaultId, mapper.writeValueAsString(data));
        } catch (Exception e) {
            log.error("Failed to serialize vault data for vault {}: {}", vaultId, e.getMessage(), e);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// INFRA — security
// ─────────────────────────────────────────────────────────────────────────────
