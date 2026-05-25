package tech.lemnova.continuum.infra.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import tech.lemnova.continuum.domain.user.User;

import java.lang.reflect.Field;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceUnitTest {

    @Test
    void generateAndParseToken() throws Exception {
        // provide a mock environment so JwtService can initialize properly
        org.springframework.mock.env.MockEnvironment env = new org.springframework.mock.env.MockEnvironment();
        // include the test profile so JwtService generates a random secret if needed
        env.setActiveProfiles("test");
        JwtService jwtService = new JwtService(env);

        // secret must be at least 32 bytes for HS256
        String secret = "01234567890123456789012345678901";

        Field secretField = JwtService.class.getDeclaredField("secret");
        secretField.setAccessible(true);
        secretField.set(jwtService, secret);

        Field expField = JwtService.class.getDeclaredField("accessTokenExpirationMs");
        expField.setAccessible(true);
        expField.setLong(jwtService, 1000L * 60 * 60); // 1 hour

        String token = jwtService.generateAccessToken("user-123", "alice", "alice@example.com", "vault-123");
        assertThat(token).isNotNull();

        Claims claims = jwtService.parse(token);
        assertThat(claims.getSubject()).isEqualTo("alice@example.com");
        assertThat(claims.get("email", String.class)).isEqualTo("alice@example.com");
        assertThat(jwtService.extractUserId(token)).isEqualTo("user-123");
        assertThat(jwtService.isValid(token)).isTrue();
    }

    @Test
    void generateFromUser() throws Exception {
        // provide a mock environment so JwtService can initialize properly
        org.springframework.mock.env.MockEnvironment env = new org.springframework.mock.env.MockEnvironment();
        env.setActiveProfiles("test");
        JwtService jwtService = new JwtService(env);

        String secret = "01234567890123456789012345678901";

        Field secretField = JwtService.class.getDeclaredField("secret");
        secretField.setAccessible(true);
        secretField.set(jwtService, secret);

        Field expField = JwtService.class.getDeclaredField("accessTokenExpirationMs");
        expField.setAccessible(true);
        expField.setLong(jwtService, 1000L * 60 * 60);

        UUID userId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
        User user = new User();
        user.setId(userId.toString());
        user.setUsername("bob");
        user.setEmail("bob@example.com");
        user.setRole("USER");

        String token = jwtService.generateFromUser(user);
        assertThat(token).isNotNull();

        Claims claims = jwtService.parse(token);
        assertThat(claims.getSubject()).isEqualTo("bob");
        assertThat(jwtService.extractUserId(token)).isEqualTo(userId.toString());
        assertThat(jwtService.isValid(token)).isTrue();
    }

    @Test
    void extractUserIdAsUUID() throws Exception {
        // provide a mock environment so JwtService can initialize properly
        org.springframework.mock.env.MockEnvironment env = new org.springframework.mock.env.MockEnvironment();
        env.setActiveProfiles("test");
        JwtService jwtService = new JwtService(env);

        String secret = "01234567890123456789012345678901";

        Field secretField = JwtService.class.getDeclaredField("secret");
        secretField.setAccessible(true);
        secretField.set(jwtService, secret);

        Field expField = JwtService.class.getDeclaredField("accessTokenExpirationMs");
        expField.setAccessible(true);
        expField.setLong(jwtService, 1000L * 60 * 60);

        UUID userId = UUID.fromString("987e6543-e89b-12d3-a456-426614174999");
        String token = jwtService.generateAccessToken(userId.toString(), "charlie", "charlie@example.com", "vault-456");

        UUID extractedId = jwtService.extractUserIdAsUUID(token);
        assertThat(extractedId).isEqualTo(userId);
    }
}

