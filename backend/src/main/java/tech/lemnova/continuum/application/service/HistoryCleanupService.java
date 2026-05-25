package tech.lemnova.continuum.application.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.domain.plan.PlanType;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.persistence.EntityRepository;
import tech.lemnova.continuum.infra.repository.TimeEntryRepository;
import tech.lemnova.continuum.infra.persistence.TrackingEventRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HistoryCleanupService {

    private final UserRepository userRepo;
    private final TimeEntryRepository timeEntryRepo;
    private final TrackingEventRepository trackingRepo;
    private final EntityRepository entityRepo;

    @Scheduled(cron = "0 0 2 * * ?")  // Daily at 2 AM
    public void cleanupFreeUsers() {
        List<User> freeUsers = userRepo.findByPlan(PlanType.FREE);
        LocalDate cutoff = LocalDate.now().minusDays(30);
        Instant now = Instant.now();

        for (User user : freeUsers) {
            // Archive old TimeEntries
            timeEntryRepo.findOldEventsByUserId(user.getId(), cutoff)
                    .forEach(entry -> {
                        entry.setArchivedAt(now);
                        timeEntryRepo.save(entry);
                    });

            // Archive old TrackingEvents
            trackingRepo.findOldEventsByUserId(user.getId(), cutoff)
                    .forEach(event -> {
                        event.setArchivedAt(now);
                        trackingRepo.save(event);
                    });

            // Archive old Entities
            Instant cutoffInstant = cutoff.atStartOfDay(ZoneId.systemDefault()).toInstant();
            entityRepo.findByUserId(user.getId()).stream()
                    .filter(entity -> entity.getCreatedAt().isBefore(cutoffInstant))
                    .forEach(entity -> {
                        entity.setArchivedAt(now);
                        entityRepo.save(entity);
                    });
        }
    }
}
