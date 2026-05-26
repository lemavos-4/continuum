package tech.lemnova.continuum.controller.dto.auth;

/**
 * DTO para resposta do endpoint de refresh token.
 * Retorna apenas o novo Access Token e, opcionalmente, um novo Refresh Token.
 * 
 * Estratégia de Refresh Token:
 * 1. STATELESS (atual): Apenas retorna novo Access Token
 *    - Simples, escalável
 *    - Refresh Token original continua válido
 * 
 * 2. ROTATION (opcional): Retorna novo Access + novo Refresh Token
 *    - Mais seguro, revoga token antigo
 *    - Requer lógica adicional no cliente
 */
public record RefreshTokenResponse(
    String accessToken,
    Long expiresIn,
    String tokenType,
    String refreshToken // null se não usar rotation
) {
    /**
     * Constructor para refresh sem rotação (apenas novo access token)
     */
    public RefreshTokenResponse(String accessToken, Long expiresIn) {
        this(accessToken, expiresIn, "Bearer", null);
    }

    /**
     * Constructor para refresh com rotação (novo access + novo refresh)
     */
    public static RefreshTokenResponse withRotation(String accessToken, Long expiresIn, String newRefreshToken) {
        return new RefreshTokenResponse(accessToken, expiresIn, "Bearer", newRefreshToken);
    }
}
