package tech.lemnova.continuum.infra.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gerenciador de Rate Limiting baseado em Bucket4j.
 * Rastreia requisições por IP para endpoints sensíveis.
 */
@Component
public class RateLimitingManager {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    // 5 requisições a cada 15 minutos (900 segundos)
    private static final int REQUESTS = 5;
    private static final int DURATION_SECONDS = 900;

    /**
     * Verifica se o IP ultrapassou o limite de requisições.
     * @param ip Endereço IP do cliente
     * @return true se permitido, false se limite excedido
     */
    public boolean isAllowed(String ip) {
        Bucket bucket = cache.computeIfAbsent(ip, k -> createNewBucket());
        return bucket.tryConsume(1);
    }

    /**
     * Obtém os tokens restantes para um IP específico.
     * @param ip Endereço IP do cliente
     * @return Número de requisições permitidas restantes
     */
    public long getRemainingTokens(String ip) {
        Bucket bucket = cache.get(ip);
        if (bucket == null) {
            return REQUESTS;
        }
        // Usa getAvailableTokens() para obter tokens disponíveis na versão 8.x+ do Bucket4j
        return bucket.getAvailableTokens();
    }

    private Bucket createNewBucket() {
        Bandwidth limit = Bandwidth.classic(REQUESTS, Refill.intervally(REQUESTS, Duration.ofSeconds(DURATION_SECONDS)));
        return Bucket4j.builder()
                .addLimit(limit)
                .build();
    }
}
