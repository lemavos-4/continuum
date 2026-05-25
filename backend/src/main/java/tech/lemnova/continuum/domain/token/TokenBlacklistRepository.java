package tech.lemnova.continuum.domain.token;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TokenBlacklistRepository extends MongoRepository<TokenBlacklist, String> {
    Optional<TokenBlacklist> findByJti(String jti);
    void deleteByUserId(String userId);
    long countByUserId(String userId);
}
