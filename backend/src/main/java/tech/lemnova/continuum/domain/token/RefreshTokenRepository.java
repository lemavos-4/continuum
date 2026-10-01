package tech.lemnova.continuum.domain.token;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends MongoRepository<RefreshToken, String> {

    /**
     * Busca um refresh token válido (não expirado e não revogado) pelo token
     */
    @Query("{ 'token': ?0, 'revokedAt': null, 'expiryDate': { $gt: new java.util.Date() } }")
    Optional<RefreshToken> findByTokenAndValid(String token);

    /**
     * Busca todos os refresh tokens de um usuário (válidos ou não)
     */
    Optional<RefreshToken> findByToken(String token);

    /**
     * Lista todos os tokens de um usuário que ainda não foram revogados
     */
    List<RefreshToken> findByUserIdAndRevokedAtIsNull(String userId);

    /**
     * Lista todos os tokens de um usuário (independente do status)
     */
    List<RefreshToken> findByUserId(String userId);

    /**
     * Deleta todos os tokens revogados ou expirados de um usuário
     */
    long deleteByUserIdAndRevokedAtIsNotNull(String userId);

    /**
     * Deleta todos os tokens expirados
     */
    long deleteByExpiryDateBefore(Instant expiryDate);

    /**
     * Deleta todos os tokens de um usuário (para logout completo)
     */
    long deleteByUserId(String userId);
}
