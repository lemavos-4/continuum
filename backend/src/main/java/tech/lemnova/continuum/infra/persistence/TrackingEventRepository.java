package tech.lemnova.continuum.infra.persistence;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import tech.lemnova.continuum.domain.tracking.TrackingEvent;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TrackingEventRepository extends MongoRepository<TrackingEvent, String> {
        List<TrackingEvent> findByUserIdAndEntityIdAndArchivedAtIsNull(String userId, String entityId);
    List<TrackingEvent> findByUserId(String userId);
    List<TrackingEvent> findByUserIdAndEntityId(String userId, String entityId);
    List<TrackingEvent> findByUserIdAndEntityIdAndDate(String userId, String entityId, LocalDate date);
    long countByUserId(String userId);
    void deleteByUserId(String userId);

    // For history cleanup
    List<TrackingEvent> findByUserIdAndArchivedAtIsNull(String userId);
    @Query("{ 'userId': ?0, 'date': { $lt: ?1 } }")
    List<TrackingEvent> findOldEventsByUserId(String userId, LocalDate cutoffDate);
}