package onl.continuum.continuum.infra.persistence;

import org.springframework.data.mongodb.repository.MongoRepository;
import onl.continuum.continuum.domain.metrics.UserScoreSnapshot;

import java.util.Optional;

public interface UserScoreSnapshotRepository extends MongoRepository<UserScoreSnapshot, String> {
    Optional<UserScoreSnapshot> findByUserId(String userId);
}
