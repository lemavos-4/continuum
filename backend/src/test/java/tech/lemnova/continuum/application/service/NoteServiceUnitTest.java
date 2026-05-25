package tech.lemnova.continuum.application.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import tech.lemnova.continuum.controller.dto.note.NoteCreateRequest;
import tech.lemnova.continuum.controller.dto.note.NoteUpdateRequest;
import tech.lemnova.continuum.domain.entity.Entity;
import tech.lemnova.continuum.domain.note.Note;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.persistence.EntityRepository;
import tech.lemnova.continuum.infra.persistence.NoteRepository;
import tech.lemnova.continuum.infra.persistence.NoteLinkRepository;
import tech.lemnova.continuum.infra.security.CustomUserDetails;
import tech.lemnova.continuum.infra.vault.VaultStorageService;
import tech.lemnova.continuum.application.service.TiptapParserService;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

public class NoteServiceUnitTest {

    @Mock private NoteRepository noteRepo;
    @Mock private NoteLinkRepository noteLinkRepo;
    @Mock private EntityRepository entityRepo;
    @Mock private VaultStorageService storageService;
    @Mock private UserService userService;
    @Mock private ExtractionService extractionService;
    @Mock private TiptapParserService tiptapParserService;
    @Mock private PlanConfiguration planConfig;
    @Mock private UserRepository userRepository;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private NoteService noteService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        User mockUser = new User();
        mockUser.setId("user1");
        mockUser.setEmail("test@test.com");
        when(userRepository.findById(anyString())).thenReturn(Optional.of(mockUser));
        when(planConfig.canCreateNote(any(), anyLong())).thenReturn(true);
        when(extractionService.extractEntityIds(anyString(), anyList())).thenReturn(List.of());
    }

    private void setAuthenticatedUser(String userId) {
        User user = new User();
        user.setId(userId);
        user.setUsername("tester");
        user.setEmail("tester@example.com");

        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(details, null));
    }

    @Test
    void create_savesNoteWithContent() throws Exception {
        setAuthenticatedUser("user1");

        ObjectMapper mapper = new ObjectMapper();
        JsonNode contentNode = mapper.readTree("{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Test content\"}]}]}");

        Note savedNote = new Note();
        savedNote.setId("n1");
        savedNote.setUserId("user1");
        savedNote.setTitle("Test");
        savedNote.setContent(contentNode.toString());
        savedNote.setCreatedAt(Instant.now());

        when(noteRepo.save(any(Note.class))).thenReturn(savedNote);
        when(entityRepo.findByUserId("user1")).thenReturn(List.of());

        var result = noteService.create(new tech.lemnova.continuum.controller.dto.note.NoteCreateRequest("Test", contentNode, "", "note"));

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo("n1");
        assertThat(result.content().toString()).isEqualTo(contentNode.toString());
    }

    @Test
    void get_returnsNoteForValidUserAndId() {
        setAuthenticatedUser("user1");
        String noteId = "n1";
        Note note = new Note();
        note.setId(noteId);
        note.setUserId("user1");
        note.setTitle("Test");
        note.setContent("Content");

        when(noteRepo.findById(noteId)).thenReturn(Optional.of(note));

        var result = noteService.getById(noteId);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(noteId);
    }

    @Test
    void list_returnsAllNotesForUser() {
        setAuthenticatedUser("user1");
        Note note1 = new Note();
        note1.setId("n1");
        note1.setUserId("user1");

        Note note2 = new Note();
        note2.setId("n2");
        note2.setUserId("user1");

        when(noteRepo.findByUserId("user1")).thenReturn(List.of(note1, note2));

        var result = noteService.listByUser();

        assertThat(result).hasSize(2);
    }
}

