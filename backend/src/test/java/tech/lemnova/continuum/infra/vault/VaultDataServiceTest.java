package tech.lemnova.continuum.infra.vault;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import tech.lemnova.continuum.domain.entity.Entity;
import tech.lemnova.continuum.domain.note.NoteIndex;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class VaultDataServiceTest {

    @Mock VaultStorageService storage;
    VaultDataService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new VaultDataService(storage);
    }

    @Test
    void readNoteIndex_returnsEmptyList_whenVaultEmpty() {
        when(storage.loadNoteIndex("v1")).thenReturn(Optional.empty());
        assertThat(service.readNoteIndex("v1")).isEmpty();
    }

    @Test
    void readNoteIndex_deserializesJson() {
        String json = "[{\"id\":\"n1\",\"userId\":\"u1\",\"title\":\"Hello\"}]";
        when(storage.loadNoteIndex("v1")).thenReturn(Optional.of(json));
        List<NoteIndex> result = service.readNoteIndex("v1");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("n1");
    }

    @Test
    void writeNoteIndex_serializes_andCallsStorage() {
        NoteIndex ni = new NoteIndex();
        ni.setId("n1");
        ni.setUserId("u1");
        ni.setTitle("Test");
        service.writeNoteIndex("v1", List.of(ni));
        verify(storage).saveNoteIndex(eq("v1"), contains("\"id\":\"n1\""));
    }

    @Test
    void readEntities_returnsEmptyList_whenVaultEmpty() {
        when(storage.loadEntities("v1")).thenReturn(Optional.empty());
        assertThat(service.readEntities("v1")).isEmpty();
    }

    @Test
    void readFolders_returnsEmptyList_whenVaultEmpty() {
        when(storage.loadFolders("v1")).thenReturn(Optional.empty());
        assertThat(service.readFolders("v1")).isEmpty();
    }

    @Test
    void readTrackingEvents_returnsEmptyList_whenVaultEmpty() {
        when(storage.loadTrackingEvents("v1")).thenReturn(Optional.empty());
        assertThat(service.readTrackingEvents("v1")).isEmpty();
    }

    @Test
    void readRefs_returnsEmptyList_whenVaultEmpty() {
        when(storage.loadRefs("v1")).thenReturn(Optional.empty());
        assertThat(service.readRefs("v1")).isEmpty();
    }
}
