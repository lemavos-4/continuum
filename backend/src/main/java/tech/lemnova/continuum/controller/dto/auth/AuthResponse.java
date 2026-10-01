package tech.lemnova.continuum.controller.dto.auth;

import tech.lemnova.continuum.domain.plan.PlanType;

public record AuthResponse(
    String token,
    String accessToken,
    String refreshToken,
    String userId,
    String username,
    String email,
    PlanType plan,
    boolean isNewUser
) {
    // Constructor para compatibilidade com código antigo (apenas 1 token)
    public AuthResponse(String token, String userId, String username, String email, PlanType plan) {
        this(token, token, "", userId, username, email, plan, false);
    }

    // Constructor para novo padrão com Access + Refresh tokens
    public static AuthResponse withTokenPair(String accessToken, String refreshToken, String userId, String username, String email, PlanType plan) {
        return new AuthResponse(accessToken, accessToken, refreshToken, userId, username, email, plan, false);
    }

    // Retorna uma cópia marcando se o usuário acabou de ser criado
    public AuthResponse withNewUserFlag(boolean newUser) {
        return new AuthResponse(token, accessToken, refreshToken, userId, username, email, plan, newUser);
    }
}
