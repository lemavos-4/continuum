package tech.lemnova.continuum.infra.persistence;

import org.springframework.data.mongodb.repository.MongoRepository;
import tech.lemnova.continuum.domain.metrics.UserScoreSnapshot;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface UserScoreSnapshotRepository extends MongoRepository<UserScoreSnapshot, String> {
    Optional<UserScoreSnapshot> findByUserIdAndDate(String userId, LocalDate date);
    List<UserScoreSnapshot> findByUserIdAndDateBetweenOrderByDateAsc(String userId, LocalDate from, LocalDate to);
    void deleteByUserId(String userId);
}
