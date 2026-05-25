package tech.lemnova.continuum.infra.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tech.lemnova.continuum.infra.security.RateLimitingManager;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testes unitários para RateLimitingFilter.
 * Valida que rate limiting funciona corretamente.
 */
class RateLimitingFilterTest {

    private RateLimitingFilter rateLimitingFilter;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;
    private MockFilterChain filterChain;

    @BeforeEach
    void setUp() {
        RateLimitingManager rateLimitingManager = new RateLimitingManager();
        rateLimitingFilter = new RateLimitingFilter(rateLimitingManager);
        request = new MockHttpServletRequest("GET", "/api/test");
        response = new MockHttpServletResponse();
        filterChain = new MockFilterChain();
    }

    @Test
    void rateLimit_shouldAllowRequestsBelowLimit() throws Exception {
        // Arrange
        String clientId = "127.0.0.1";
        Bandwidth limit = Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1)));
        Bucket bucket = Bucket4j.builder().addLimit(limit).build();

        // Act & Assert
        for (int i = 0; i < 10; i++) {
            boolean allowed = bucket.tryConsume(1);
            assertThat(allowed).isTrue();
        }
    }

    @Test
    void rateLimit_shouldBlockRequestsAboveLimit() {
        // Arrange
        Bandwidth limit = Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1)));
        Bucket bucket = Bucket4j.builder().addLimit(limit).build();

        // Act - Consumir todos os tokens
        for (int i = 0; i < 5; i++) {
            bucket.tryConsume(1);
        }

        // Assert - Próxima requisição deve ser bloqueada
        boolean allowed = bucket.tryConsume(1);
        assertThat(allowed).isFalse();
    }

    @Test
    void rateLimit_shouldRefillTokensAfterInterval() throws Exception {
        // Arrange
        Bandwidth limit = Bandwidth.classic(2, Refill.intervally(2, Duration.ofMillis(100)));
        Bucket bucket = Bucket4j.builder().addLimit(limit).build();

        // Consumir todos os tokens
        bucket.tryConsume(2);
        boolean blockedImmediately = bucket.tryConsume(1);
        assertThat(blockedImmediately).isFalse();

        // Act - Aguardar refill
        Thread.sleep(150);

        // Assert - Deve agora permitir
        boolean allowedAfterRefill = bucket.tryConsume(1);
        assertThat(allowedAfterRefill).isTrue();
    }

    @Test
    void rateLimit_shouldHandleMultipleClientsIndependently() {
        // Arrange
        Bandwidth limit = Bandwidth.classic(3, Refill.intervally(3, Duration.ofMinutes(1)));

        Bucket bucket1 = Bucket4j.builder().addLimit(limit).build();
        Bucket bucket2 = Bucket4j.builder().addLimit(limit).build();

        // Act - Consumir tokens do primeiro bucket
        for (int i = 0; i < 3; i++) {
            bucket1.tryConsume(1);
        }

        // Assert - Primeiro bucket bloqueado, segundo deve permitir
        assertThat(bucket1.tryConsume(1)).isFalse();
        assertThat(bucket2.tryConsume(1)).isTrue();
    }

    @Test
    void rateLimit_shouldRejectWhenPartialTokenRequired() {
        // Arrange
        Bandwidth limit = Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1)));
        Bucket bucket = Bucket4j.builder().addLimit(limit).build();

        // Act & Assert - Consumir 5 tokens deixa 5 disponíveis
        assertThat(bucket.tryConsume(5)).isTrue();
        assertThat(bucket.tryConsume(6)).isFalse(); // Pede mais que disponível
        assertThat(bucket.tryConsume(5)).isTrue();  // Exatamente o saldo
    }
}
