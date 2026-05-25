package tech.lemnova.continuum.domain.subscription;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends MongoRepository<Subscription, String> {
    Optional<Subscription> findByUserId(String userId);
    Optional<Subscription> findByLemonSqueezySubscriptionId(String lemonSqueezySubscriptionId);
    List<Subscription> findAllByUserId(String userId);
    void deleteByUserId(String userId);
}
