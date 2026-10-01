package tech.lemnova.continuum.domain.stripe;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface StripeEventLogRepository extends MongoRepository<StripeEventLog, String> {
    boolean existsByEventId(String eventId);

    Optional<StripeEventLog> findByEventId(String eventId);

    /** Events that never completed — replayed by the reconciliation job. */
    List<StripeEventLog> findByStatusInAndUpdatedAtBefore(List<StripeEventStatus> statuses, Instant before);
}
