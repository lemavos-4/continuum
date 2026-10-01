package tech.lemnova.continuum.infra.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tech.lemnova.continuum.domain.timetracking.TimerSession;
import tech.lemnova.continuum.domain.timetracking.TimerStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface TimerSessionRepository extends MongoRepository<TimerSession, String> {

    /**
     * Find active timer for an entity
     */
    Optional<TimerSession> findByUserIdAndEntityIdAndStatus(String userId, String entityId, TimerStatus status);

    /**
     * Find all active timers for a user
     */
    List<TimerSession> findByUserIdAndStatus(String userId, TimerStatus status);

    /**
     * Find latest timer session for an entity
     */
    Optional<TimerSession> findFirstByUserIdAndEntityIdOrderByCreatedAtDesc(String userId, String entityId);

    /**
     * Find all sessions for an entity
     */
    List<TimerSession> findByUserIdAndEntityIdOrderByCreatedAtDesc(String userId, String entityId);

    /**
     * Delete all sessions for an entity (cascade delete)
     */
    void deleteByEntityId(String entityId);

    /**
     * Check if entity has active timer
     */
    boolean existsByUserIdAndEntityIdAndStatus(String userId, String entityId, TimerStatus status);
}
