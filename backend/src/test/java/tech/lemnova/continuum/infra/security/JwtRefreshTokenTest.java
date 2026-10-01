package tech.lemnova.continuum.infra.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.lang.reflect.Field;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Testes para geração e validação de Refresh Tokens.
 * Refresh tokens têm longa duração (7 dias) e são usados para renovar Access Tokens.
 */
class JwtRefreshTokenTest {

    private JwtService jwtService;
    private String secret;

    @BeforeEach
    void setUp() throws Exception {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("test");
        jwtService = new JwtService(env);

        secret = "01234567890123456789012345678901";
        Field secretField = JwtService.class.getDeclaredField("secret");
        secretField.setAccessible(true);
        secretField.set(jwtService, secret);

        Field accessExpField = JwtService.class.getDeclaredField("accessTokenExpirationMs");
        accessExpField.setAccessible(true);
        accessExpField.setLong(jwtService, 900000L); // 15 minutos

        Field refreshExpField = JwtService.class.getDeclaredField("refreshTokenExpirationMs");
        refreshExpField.setAccessible(true);
        refreshExpField.setLong(jwtService, 604800000L); // 7 dias
    }

    @Test
    void generateRefreshToken_shouldContainTypeRefresh() {
        String refreshToken = jwtService.generateRefreshToken("user-123", "alice", "alice@example.com", "vault-456");
        assertThat(refreshToken).isNotNull();

        Claims claims = jwtService.parse(refreshToken);
        assertThat(claims.get("type", String.class)).isEqualTo(JwtService.TOKEN_TYPE_REFRESH);
    }

    @Test
    void generateRefreshToken_shouldIncludeJti() {
        String refreshToken = jwtService.generateRefreshToken("user-123", "alice", "alice@example.com", "vault-456");

        Claims claims = jwtService.parse(refreshToken);
        String jti = claims.get("jti", String.class);
        assertThat(jti).isNotNull().isNotBlank();
    }

    @Test
    void generateRefreshToken_shouldHaveValidClaims() {
        String userId = "user-789";
        String username = "bob";
        String email = "bob@example.com";
        String vaultId = "vault-123";

        String refreshToken = jwtService.generateRefreshToken(userId, username, email, vaultId);

        Claims claims = jwtService.parse(refreshToken);
        assertThat(claims.get("userId", String.class)).isEqualTo(userId);
        assertThat(claims.get("username", String.class)).isEqualTo(username);
        assertThat(claims.get("email", String.class)).isEqualTo(email);
        assertThat(claims.get("vaultId", String.class)).isEqualTo(vaultId);
        assertThat(claims.getSubject()).isEqualTo(email);
    }

    @Test
    void generateTokenPair_shouldProduceBothAccessAndRefreshTokens() {
        JwtService.TokenPair pair = jwtService.generateTokenPair("user-123", "alice", "alice@example.com", "vault-456");

        assertThat(pair.accessToken()).isNotNull().isNotBlank();
        assertThat(pair.refreshToken()).isNotNull().isNotBlank();
        assertThat(pair.accessToken()).isNotEqualTo(pair.refreshToken());

        Claims accessClaims = jwtService.parse(pair.accessToken());
        Claims refreshClaims = jwtService.parse(pair.refreshToken());

        assertThat(accessClaims.get("type", String.class)).isEqualTo(JwtService.TOKEN_TYPE_ACCESS);
        assertThat(refreshClaims.get("type", String.class)).isEqualTo(JwtService.TOKEN_TYPE_REFRESH);
    }

    @Test
    void refreshToken_shouldHaveLongerExpirationThanAccessToken() throws Exception {
        JwtService.TokenPair pair = jwtService.generateTokenPair("user-123", "alice", "alice@example.com", "vault-456");

        Claims accessClaims = jwtService.parse(pair.accessToken());
        Claims refreshClaims = jwtService.parse(pair.refreshToken());

        Date accessExpiration = accessClaims.getExpiration();
        Date refreshExpiration = refreshClaims.getExpiration();

        assertThat(refreshExpiration.getTime()).isGreaterThan(accessExpiration.getTime());
    }

    @Test
    void extractVaultId_shouldWorkWithRefreshToken() {
        String vaultId = "vault-abc123def456";
        String refreshToken = jwtService.generateRefreshToken("user-123", "alice", "alice@example.com", vaultId);

        String extractedVaultId = jwtService.extractVaultId(refreshToken);
        assertThat(extractedVaultId).isEqualTo(vaultId);
    }

    @Test
    void extractEmail_shouldWorkWithRefreshToken() {
        String email = "alice@example.com";
        String refreshToken = jwtService.generateRefreshToken("user-123", "alice", email, "vault-456");

        String extractedEmail = jwtService.extractEmail(refreshToken);
        assertThat(extractedEmail).isEqualTo(email);
    }

    @Test
    void multipleRefreshTokens_shouldHaveDifferentJti() {
        String token1 = jwtService.generateRefreshToken("user-123", "alice", "alice@example.com", "vault-456");
        String token2 = jwtService.generateRefreshToken("user-123", "alice", "alice@example.com", "vault-456");

        Claims claims1 = jwtService.parse(token1);
        Claims claims2 = jwtService.parse(token2);

        String jti1 = claims1.get("jti", String.class);
        String jti2 = claims2.get("jti", String.class);

        assertThat(jti1).isNotEqualTo(jti2).as("Each refresh token should have a unique jti");
    }

    @Test
    void isValid_shouldReturnTrueForValidRefreshToken() {
        String refreshToken = jwtService.generateRefreshToken("user-123", "alice", "alice@example.com", "vault-456");
        assertThat(jwtService.isValid(refreshToken)).isTrue();
    }

    @Test
    void isValid_shouldReturnFalseForExpiredRefreshToken() throws Exception {
        // Criar refresh token com expiração de 1ms
        Field refreshExpField = JwtService.class.getDeclaredField("refreshTokenExpirationMs");
        refreshExpField.setAccessible(true);
        refreshExpField.setLong(jwtService, 1L);

        String expiredRefreshToken = jwtService.generateRefreshToken("user-123", "alice", "alice@example.com", "vault-456");

        // Aguardar um pouco para garantir que o token expirou
        Thread.sleep(100);

        assertThat(jwtService.isValid(expiredRefreshToken)).isFalse();
    }
}
