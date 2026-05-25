package tech.lemnova.continuum.infra.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.domain.user.User;

import jakarta.annotation.PostConstruct;

import java.security.Key;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);
    public static final String TOKEN_TYPE_ACCESS = "access";
    public static final String TOKEN_TYPE_REFRESH = "refresh";

    @Value("${jwt.secret}")
    private String secret;

    private final Environment env;

    // Access Token: 1 hora (3600000 ms) - suficiente para flowos de OAuth sem expiração imediata
    @Value("${jwt.access-token.expiration:3600000}")
    private long accessTokenExpirationMs;

    // Refresh Token: 7 dias (604800000 ms)
    @Value("${jwt.refresh-token.expiration:604800000}")
    private long refreshTokenExpirationMs;

    // Mantém compatibilidade com configurações antigas
    @Value("${jwt.expiration:86400000}")
    private long legacyExpirationMs;

    public JwtService(Environment env) {
        this.env = env;
    }

    @PostConstruct
    private void validateSecret() {
        boolean isTest = (env == null) || Arrays.stream(env.getActiveProfiles()).anyMatch(p -> "test".equalsIgnoreCase(p));
        
        if (secret == null || secret.isBlank()) {
            if (isTest) {
                byte[] rnd = new byte[48];
                new SecureRandom().nextBytes(rnd);
                secret = Base64.getEncoder().encodeToString(rnd);
                return;
            }
            throw new IllegalStateException(
                "❌ FATAL: JWT_SECRET is REQUIRED and NOT SET. " +
                "Set environment variable JWT_SECRET with a minimum of 32 characters (256 bits for HS256). " +
                "Example: export JWT_SECRET=$(openssl rand -base64 32)"
            );
        }

        // Validar que a chave tem pelo menos 256 bits (32 bytes)
        byte[] decodedSecret = secret.getBytes();
        int bitLength = decodedSecret.length * 8;
        
        if (bitLength < 256) {
            if (isTest) {
                // Em teste, expandir a chave se necessário
                byte[] seed = secret.getBytes();
                byte[] expanded = new byte[32];
                for (int i = 0; i < expanded.length; i++) {
                    expanded[i] = seed[i % seed.length];
                }
                secret = Base64.getEncoder().encodeToString(expanded);
                logger.warn("TEST MODE: JWT secret auto-expanded to 256 bits");
                return;
            }
            throw new IllegalStateException(
                String.format(
                    "❌ JWT_SECRET is TOO SHORT! Current: %d bits, Required: 256 bits (32 characters minimum). " +
                    "Generate a new secret with: openssl rand -base64 32",
                    bitLength
                )
            );
        }

        logger.info("JWT_SECRET validated: {} bits (HS256 ready)", bitLength);
    }

    private Key key() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    /**
     * Gera um Access Token com duração de 1 hora.
     * Suficiente para fluxos OAuth e operações normais do aplicativo.
     * Use refresh token para renovar quando expirado.
     */
    public String generateAccessToken(String userId, String username, String email, String vaultId) {
        return Jwts.builder()
                .setClaims(Map.of(
                    "userId", userId,
                    "username", username,
                    "email", email,
                    "vaultId", vaultId,
                    "type", TOKEN_TYPE_ACCESS
                ))
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + accessTokenExpirationMs))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Gera um Refresh Token com longa duração (7 dias).
     * Deve ser armazenado com segurança no cliente (HttpOnly cookie ou secure storage).
     */
    public String generateRefreshToken(String userId, String username, String email, String vaultId) {
        return Jwts.builder()
                .setClaims(Map.of(
                    "userId", userId,
                    "username", username,
                    "email", email,
                    "vaultId", vaultId,
                    "type", TOKEN_TYPE_REFRESH,
                    "jti", UUID.randomUUID().toString()
                ))
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + refreshTokenExpirationMs))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Gera ambos Access e Refresh tokens.
     */
    public TokenPair generateTokenPair(String userId, String username, String email, String vaultId) {
        return new TokenPair(
            generateAccessToken(userId, username, email, vaultId),
            generateRefreshToken(userId, username, email, vaultId)
        );
    }

    /**
     * Gera tokens a partir de um User (compatível com código antigo).
     */
    public String generateFromUser(User user) {
        return generateAccessToken(user.getId().toString(), user.getUsername(), user.getEmail(), user.getVaultId());
    }

    public TokenPair generateTokenPairFromUser(User user) {
        return generateTokenPair(user.getId().toString(), user.getUsername(), user.getEmail(), user.getVaultId());
    }

    public Claims parse(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key()).build()
                .parseClaimsJws(token).getBody();
    }

    public String extractUsername(String token) { 
        String subject = parse(token).getSubject();
        if (subject != null && !subject.isBlank()) {
            return subject;
        }
        return parse(token).get("email", String.class);
    }

    public String extractEmail(String token) {
        return parse(token).get("email", String.class);
    }

    public String extractVaultId(String token) {
        return parse(token).get("vaultId", String.class);
    }
    
    public String extractUserId(String token) { 
        return parse(token).get("userId", String.class); 
    }

    public String extractTokenType(String token) {
        return parse(token).get("type", String.class);
    }

    public String extractJti(String token) {
        return parse(token).get("jti", String.class);
    }
    
    public UUID extractUserIdAsUUID(String token) {
        String userIdStr = extractUserId(token);
        return UUID.fromString(userIdStr);
    }

    public boolean isValid(String token) {
        try { 
            return !parse(token).getExpiration().before(new Date()); 
        } catch (Exception e) { 
            return false; 
        }
    }

    public boolean isAccessToken(String token) {
        try {
            String type = extractTokenType(token);
            return TOKEN_TYPE_ACCESS.equals(type);
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isRefreshToken(String token) {
        try {
            String type = extractTokenType(token);
            return TOKEN_TYPE_REFRESH.equals(type);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Retorna o tempo restante em milisegundos até a expiração.
     */
    public long getTimeUntilExpiration(String token) {
        try {
            Date expiration = parse(token).getExpiration();
            return expiration.getTime() - System.currentTimeMillis();
        } catch (Exception e) {
            return -1;
        }
    }

    /**
     * Extrai a data de emissão (iat) do token JWT como Instant.
     */
    public Instant extractIssuedAt(String token) {
        try {
            Date issuedAt = parse(token).getIssuedAt();
            return issuedAt != null ? issuedAt.toInstant() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * DTO para transportar Access e Refresh tokens juntos.
     */
    public static record TokenPair(String accessToken, String refreshToken) {}
}
