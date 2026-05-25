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
import tech.lemnova.continuum.domain.tracking.TrackingEvent;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.persistence.EntityRepository;
import tech.lemnova.continuum.infra.persistence.NoteRepository;
import tech.lemnova.continuum.infra.persistence.UserScoreSnapshotRepository;
import tech.lemnova.continuum.infra.vault.VaultDataService;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
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
    void getUserScoreTimeline_persistsGeneratedHistory() {
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
        when(scoreSnapshotRepo.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        List<ScorePoint> history = metricsService.getUserScoreTimeline("user-1");

        assertThat(history).hasSize(3);
        assertThat(history.get(0).date()).isEqual(twoDaysAgo);
        assertThat(history.get(2).date()).isEqual(LocalDate.now());
        assertThat(history).allMatch(point -> point.score() == 11.4);

        verify(scoreSnapshotRepo).deleteByUserId("user-1");

        ArgumentCaptor<List<UserScoreSnapshot>> snapshotsCaptor = ArgumentCaptor.forClass(List.class);
        verify(scoreSnapshotRepo).saveAll(snapshotsCaptor.capture());
        assertThat(snapshotsCaptor.getValue()).hasSize(3);
        assertThat(snapshotsCaptor.getValue())
                .extracting(UserScoreSnapshot::getUserId)
                .containsOnly("user-1");
        assertThat(snapshotsCaptor.getValue())
                .extracting(UserScoreSnapshot::getDate)
                .containsExactly(twoDaysAgo, twoDaysAgo.plusDays(1), LocalDate.now());
    }
}
