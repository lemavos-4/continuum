package tech.lemnova.continuum.controller.dto.auth;

import tech.lemnova.continuum.domain.plan.PlanType;

public record AuthResponse(
    String token,
    String accessToken,
    String refreshToken,
    String userId,
    String username,
    String email,
    PlanType plan
) {
    // Constructor para compatibilidade com código antigo (apenas 1 token)
    public AuthResponse(String token, String userId, String username, String email, PlanType plan) {
        this(token, token, "", userId, username, email, plan);
    }

    // Constructor para novo padrão com Access + Refresh tokens
    public static AuthResponse withTokenPair(String accessToken, String refreshToken, String userId, String username, String email, PlanType plan) {
        return new AuthResponse(accessToken, accessToken, refreshToken, userId, username, email, plan);
    }
}

