package tech.lemnova.continuum.domain.token;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

/**
 * Representa um token revogado (blacklisted).
 * Usado para invalidar tokens quando o usuário faz logout.
 */
@Document(collection = "token_blacklist")
public class TokenBlacklist {

    @Id
    private String id;
    
    private String jti; // JWT ID único para cada token
    private String userId;
    private String tokenType; // "access" ou "refresh"
    private Instant revokedAt;
    private Instant expiresAt; // Mesmo tempo de expiração do token original

    public TokenBlacklist() {}

    public TokenBlacklist(String jti, String userId, String tokenType, Instant expiresAt) {
        this.jti = jti;
        this.userId = userId;
        this.tokenType = tokenType;
        this.revokedAt = Instant.now();
        this.expiresAt = expiresAt;
    }

    // Getters e Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getJti() { return jti; }
    public void setJti(String jti) { this.jti = jti; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }

    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
