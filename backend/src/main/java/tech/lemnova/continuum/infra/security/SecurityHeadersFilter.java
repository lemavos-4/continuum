package tech.lemnova.continuum.infra.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro que garante que os Security Headers OWASP sejam sempre enviados.
 * Protege contra: Clickjacking, MIME type sniffing, XSS, e outras vulnerabilidades.
 */
@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // X-Content-Type-Options: nosniff
        // Previne que o navegador faça MIME-type sniffing
        response.setHeader("X-Content-Type-Options", "nosniff");

        // X-Frame-Options: DENY
        // Protege contra Clickjacking
        response.setHeader("X-Frame-Options", "DENY");

        // X-XSS-Protection: 1; mode=block
        // Ativa proteção XSS do navegador
        response.setHeader("X-XSS-Protection", "1; mode=block");

        // Strict-Transport-Security (HSTS)
        // Força HTTPS em produção - comentado para dev, descomente em produção
        // response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

        // Content-Security-Policy
        // Controla quais recursos podem ser carregados
        response.setHeader("Content-Security-Policy", 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self'; " +
            "connect-src 'self' http://localhost:8080 https://api.stripe.com; " +
            "frame-ancestors 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self'");

        // Referrer-Policy
        // Controla quanta informação de referrer é enviada
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // Permissions-Policy (Feature-Policy)
        // Controla quais features do navegador podem ser usadas
        response.setHeader("Permissions-Policy", 
            "geolocation=(), microphone=(), camera=(), payment=()");

        filterChain.doFilter(request, response);
    }
}
