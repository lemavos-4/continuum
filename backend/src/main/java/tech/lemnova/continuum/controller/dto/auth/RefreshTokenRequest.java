package tech.lemnova.continuum.controller.dto.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO para requisição de refresh token.
 * 
 * O token pode ser recebido de diferentes formas:
 * - Via JSON body (como aqui)
 * - Via Cookie HttpOnly (extraído por @CookieValue)
 * 
 * Escolha: Por padrão, implementamos via JSON para flexibilidade.
 * Se preferir Cookie HttpOnly, veja as instruções no AuthController.
 */
public record RefreshTokenRequest(
    @NotBlank(message = "Refresh token não pode estar vazio")
    String refreshToken
) {
}
