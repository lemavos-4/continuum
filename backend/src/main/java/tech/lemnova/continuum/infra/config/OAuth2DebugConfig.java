package tech.lemnova.continuum.infra.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import jakarta.annotation.PostConstruct;

@Configuration
@Profile("dev") // Apenas para ambiente de desenvolvimento
public class OAuth2DebugConfig {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2DebugConfig.class);

    @Value("${GOOGLE_CLIENT_ID:NOT_SET}")
    private String googleClientId;

    @Value("${GOOGLE_CLIENT_SECRET:NOT_SET}")
    private String googleClientSecret;

    @PostConstruct
    public void logOAuth2Credentials() {
        logger.info("=== OAuth2 Credentials Debug ===");
        logger.info("GOOGLE_CLIENT_ID: {}", googleClientId.isEmpty() ? "EMPTY" : "SET (length: " + googleClientId.length() + ")");
        logger.info("GOOGLE_CLIENT_SECRET: {}", googleClientSecret.isEmpty() ? "EMPTY" : "SET (length: " + googleClientSecret.length() + ")");
        logger.info("================================");

        if (googleClientId.isEmpty() || googleClientSecret.isEmpty()) {
            logger.warn("WARNING: OAuth2 credentials are not properly set! Google login will fail.");
        }
    }
}