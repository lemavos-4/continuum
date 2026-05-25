package tech.lemnova.continuum.application.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tech.lemnova.continuum.controller.dto.metrics.ScoreTimelineResponse.ScorePoint;
import tech.lemnova.continuum.domain.entity.Entity;
import tech.lemnova.continuum.domain.entity.EntityType;
import tech.lemnova.continuum.domain.metrics.UserScoreSnapshot;
import tech.lemnova.continuum.domain.note.Note;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.persistence.EntityRepository;
import tech.lemnova.continuum.infra.persistence.NoteRepository;
import tech.lemnova.continuum.infra.persistence.UserScoreSnapshotRepository;
import tech.lemnova.continuum.infra.vault.VaultDataService;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MetricsServiceTest {

    @Mock
    private UserRepository userRepo;

    @Mock
    private NoteRepository noteRepo;

    @Mock
    private EntityRepository entityRepo;

    @Mock
    private VaultDataService vaultData;

    @Mock
    private PlanConfiguration planConfig;

    @Mock
    private EntityService entityService;

    @Mock
    private UserScoreSnapshotRepository scoreSnapshotRepo;

    @InjectMocks
    private MetricsService metricsService;

    @Test
    void getUserScoreTimeline_persistsScoreDictionaryByDate() {
        User user = new User();
        user.setId("user-1");
        user.setVaultId("vault-1");

        LocalDate twoDaysAgo = LocalDate.now().minusDays(2);
        Instant noteCreatedAt = twoDaysAgo.atStartOfDay(ZoneOffset.UTC).toInstant();

        Note note = new Note();
        note.setId("note-1");
        note.setUserId("user-1");
        note.setVaultId("vault-1");
        note.setEntityIds(List.of("entity-1"));
        note.setCreatedAt(noteCreatedAt);
        note.setUpdatedAt(noteCreatedAt);

        Entity entity = Entity.builder()
                .id("entity-1")
                .userId("user-1")
                .vaultId("vault-1")
                .title("Project Alpha")
                .type(EntityType.PROJECT)
                .createdAt(noteCreatedAt)
                .trackingDates(List.of())
                .build();

        when(userRepo.findById("user-1")).thenReturn(Optional.of(user));
        when(noteRepo.findByUserId("user-1")).thenReturn(List.of(note));
        when(entityRepo.findByUserIdAndArchivedAtIsNull("user-1")).thenReturn(List.of(entity));
        when(vaultData.readTrackingEvents("vault-1")).thenReturn(List.of());
        when(scoreSnapshotRepo.findByUserId("user-1")).thenReturn(Optional.empty());
        when(scoreSnapshotRepo.save(any(UserScoreSnapshot.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<ScorePoint> history = metricsService.getUserScoreTimeline("user-1");

        assertThat(history).hasSize(3);
        assertThat(history.get(0).date()).isEqual(twoDaysAgo);
        assertThat(history.get(2).date()).isEqual(LocalDate.now());

        ArgumentCaptor<UserScoreSnapshot> snapshotCaptor = ArgumentCaptor.forClass(UserScoreSnapshot.class);
        verify(scoreSnapshotRepo).save(snapshotCaptor.capture());

        UserScoreSnapshot savedSnapshot = snapshotCaptor.getValue();
        Map<String, Double> scoresByDate = savedSnapshot.getScoresByDate();

        assertThat(savedSnapshot.getUserId()).isEqualTo("user-1");
        assertThat(scoresByDate).hasSize(3);
        assertThat(scoresByDate.keySet()).containsExactlyInAnyOrder(
                twoDaysAgo.toString(),
                twoDaysAgo.plusDays(1).toString(),
                LocalDate.now().toString()
        );
        assertThat(scoresByDate.get(LocalDate.now().toString())).isNotNull();
    }

    @Test
    void getUserScoreTimeline_preservesExistingDictionaryAndUpdatesCurrentDay() {
        User user = new User();
        user.setId("user-1");
        user.setVaultId("vault-1");

        UserScoreSnapshot existing = new UserScoreSnapshot();
        existing.setUserId("user-1");
        existing.setScoresByDate(new HashMap<>(Map.of(
                LocalDate.now().minusDays(1).toString(), 9.0,
                LocalDate.now().minusDays(2).toString(), 8.0
        )));

        when(userRepo.findById("user-1")).thenReturn(Optional.of(user));
        when(noteRepo.findByUserId("user-1")).thenReturn(List.of());
        when(entityRepo.findByUserIdAndArchivedAtIsNull("user-1")).thenReturn(List.of());
        when(vaultData.readTrackingEvents("vault-1")).thenReturn(List.of());
        when(scoreSnapshotRepo.findByUserId("user-1")).thenReturn(Optional.of(existing));
        when(scoreSnapshotRepo.save(any(UserScoreSnapshot.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<ScorePoint> history = metricsService.getUserScoreTimeline("user-1");

        assertThat(history).isNotEmpty();
        assertThat(history.stream().map(ScorePoint::date).toList()).contains(LocalDate.now());
        verify(scoreSnapshotRepo).save(any(UserScoreSnapshot.class));
    }
}
