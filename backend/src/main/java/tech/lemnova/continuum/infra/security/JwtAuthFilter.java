package tech.lemnova.continuum.infra.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tech.lemnova.continuum.domain.token.TokenBlacklistRepository;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;

import java.io.IOException;
import java.time.Instant;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final TokenBlacklistRepository tokenBlacklistRepository;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtService jwtService, CustomUserDetailsService userDetailsService, 
                        TokenBlacklistRepository tokenBlacklistRepository, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.tokenBlacklistRepository = tokenBlacklistRepository;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest req,
                                    @NonNull HttpServletResponse res,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        String path = req.getServletPath();
        if (path.startsWith("/v3/api-docs") || path.startsWith("/swagger-ui") || path.equals("/error")) {
            chain.doFilter(req, res);
            return;
        }

        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(req, res);
            return;
        }

        try {
            String token = header.substring(7);
            
            // Verificar se o token é válido
            if (!jwtService.isValid(token)) {
                log.warn("JWT token expired or invalid");
                chain.doFilter(req, res);
                return;
            }

            // Verificar se é um Access Token (não Refresh Token)
            if (!jwtService.isAccessToken(token)) {
                log.warn("JWT token is not an access token");
                chain.doFilter(req, res);
                return;
            }

            // Verificar se o token está na blacklist (revogado)
            String jti = jwtService.extractJti(token);
            if (jti != null && tokenBlacklistRepository.findByJti(jti).isPresent()) {
                log.warn("JWT token is blacklisted (revoked)");
                chain.doFilter(req, res);
                return;
            }

            // Verificar se o token foi emitido antes de lastLogoutAt
            String userId = jwtService.extractUserId(token);
            User user = userRepository.findById(userId).orElse(null);
            if (user != null && user.getLastLogoutAt() != null) {
                Instant tokenIssuedAt = jwtService.extractIssuedAt(token);
                if (tokenIssuedAt != null && tokenIssuedAt.isBefore(user.getLastLogoutAt())) {
                    log.warn("JWT token was issued before last logout for user: {}", userId);
                    chain.doFilter(req, res);
                    return;
                }
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                String username = jwtService.extractUsername(token);
                UserDetails ud = userDetailsService.loadUserByUsername(username);
                var auth = new UsernamePasswordAuthenticationToken(ud, null, ud.getAuthorities());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } catch (Exception e) {
            log.warn("JWT validation failed: {}", e.getMessage());
        }

        chain.doFilter(req, res);
    }
}

