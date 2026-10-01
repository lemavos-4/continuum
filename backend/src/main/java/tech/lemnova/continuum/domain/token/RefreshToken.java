package tech.lemnova.continuum.domain.token;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Representa um Refresh Token persistido no banco de dados.
 * Permite rotação de tokens, revogação e auditoria.
 * 
 * Segurança:
 * - Token é armazenado com hash (recomendado em produção)
 * - Expiração automática via TTL no MongoDB
 * - Associado a um usuário específico para validação
 */
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "refresh_tokens")
public class RefreshToken {

    @Id
    private String id;

    /**
     * O token JWT em si (ou hash dele).
     * Recomendação: Em produção, armazene o hash SHA-256 do token.
     */
    private String token;

    /**
     * Referência ao usuário proprietário do token
     */
    @Indexed
    private String userId;

    /**
     * Data de emissão do token
     */
    @Builder.Default
    private Instant issuedAt = Instant.now();

    /**
     * Data de expiração do token
     * MongoDB pode deletar automaticamente com TTL
     */
    @Indexed(expireAfterSeconds = 0) // TTL será definido com base em expiryDate
    private Instant expiryDate;

    /**
     * Data de revogação (se nulo, token ainda é válido)
     */
    private Instant revokedAt;

    /**
     * Informações de auditoria: IP ou user agent do cliente
     */
    private String clientInfo;

    // ======================== Getters & Setters ========================

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(Instant issuedAt) {
        this.issuedAt = issuedAt;
    }

    public Instant getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(Instant expiryDate) {
        this.expiryDate = expiryDate;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }

    public String getClientInfo() {
        return clientInfo;
    }

    public void setClientInfo(String clientInfo) {
        this.clientInfo = clientInfo;
    }

    // ======================== Métodos Utilitários ========================

    /**
     * Verifica se o token é válido (não expirado e não revogado)
     */
    public boolean isValid() {
        Instant now = Instant.now();
        boolean notExpired = expiryDate.isAfter(now);
        boolean notRevoked = revokedAt == null;
        return notExpired && notRevoked;
    }

    /**
     * Verifica se o token está expirado
     */
    public boolean isExpired() {
        return expiryDate.isBefore(Instant.now());
    }

    /**
     * Revoga o token (marca como deletado logicamente)
     */
    public void revoke() {
        this.revokedAt = Instant.now();
    }
}
