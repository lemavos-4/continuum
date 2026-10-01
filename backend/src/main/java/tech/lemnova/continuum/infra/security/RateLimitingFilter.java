package tech.lemnova.continuum.infra.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro de Rate Limiting para endpoints sensíveis de autenticação.
 * Limita o número de requisições por IP para prevenir Brute Force.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimitingManager rateLimitingManager;

    public RateLimitingFilter(RateLimitingManager rateLimitingManager) {
        this.rateLimitingManager = rateLimitingManager;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getServletPath();

        // Aplicar Rate Limiting apenas nos endpoints de autenticação sensíveis
        if (isRateLimitedEndpoint(path)) {
            String clientIp = getClientIp(request);

            if (!rateLimitingManager.isAllowed(clientIp)) {
                response.setStatus(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Too many requests. Please try again later.\"}");
                return;
            }

            // Adicionar headers informativos sobre rate limit
            long remainingTokens = rateLimitingManager.getRemainingTokens(clientIp);
            response.addHeader("X-RateLimit-Remaining", String.valueOf(remainingTokens));
            response.addHeader("X-RateLimit-Reset", String.valueOf(System.currentTimeMillis() + 900000));
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Verifica se o endpoint atual deve ter Rate Limiting aplicado.
     */
    private boolean isRateLimitedEndpoint(String path) {
        return path.equals("/api/auth/login") || path.equals("/api/auth/register") ||
               path.equals("/auth/login") || path.equals("/auth/register") ||
               path.equals("/api/auth/google/callback") ||
               path.equals("/api/auth/resend-verification") || path.equals("/auth/resend-verification");
    }

    /**
     * Extrai o IP do cliente, considerando proxies e load balancers.
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // X-Forwarded-For pode conter múltiplos IPs, pegar o primeiro
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }
}
