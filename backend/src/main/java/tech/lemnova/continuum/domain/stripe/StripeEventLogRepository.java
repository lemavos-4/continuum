package tech.lemnova.continuum.domain.stripe;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StripeEventLogRepository extends MongoRepository<StripeEventLog, String> {
    boolean existsByEventId(String eventId);
}
