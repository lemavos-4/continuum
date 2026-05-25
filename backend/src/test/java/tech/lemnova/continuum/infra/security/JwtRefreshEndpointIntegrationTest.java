package tech.lemnova.continuum.infra.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testes de integração para a funcionalidade de refresh token.
 * Valida que o endpoint /api/auth/refresh regenera corretamente.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class JwtRefreshEndpointIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    private User testUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        testUser = new User();
        testUser.setEmail("test@example.com");
        testUser.setUsername("testuser");
        testUser.setVaultId("vault-123");
        testUser.setActive(true);
        testUser.setEmailVerified(true);
        testUser = userRepository.save(testUser);
    }

    @Test
    void refreshToken_shouldRegenerateAccessToken() throws Exception {
        // Arrange
        JwtService.TokenPair tokenPair = jwtService.generateTokenPair(
                testUser.getId(),
                testUser.getUsername(),
                testUser.getEmail(),
                testUser.getVaultId()
        );

        String refreshToken = tokenPair.refreshToken();
        String originalAccessToken = tokenPair.accessToken();

        // Act - Enviar refresh request com o refresh token
        String requestBody = String.format("{\"refreshToken\": \"%s\"}", refreshToken);
        MvcResult result = mockMvc.perform(
                post("/api/auth/refresh")
                        .header("Authorization", "Bearer " + refreshToken)
                        .contentType("application/json")
                        .content(requestBody)
        ).andExpect(status().isOk()).andReturn();

        // Assert
        String responseBody = result.getResponse().getContentAsString();
        assertThat(responseBody).contains("\"accessToken\"");
        assertThat(responseBody).doesNotContain(originalAccessToken);
    }

    @Test
    void refreshToken_withInvalidToken_shouldReturn401() throws Exception {
        // Arrange
        String invalidRefreshToken = "invalid.token.here";

        // Act & Assert
        mockMvc.perform(
                post("/api/auth/refresh")
                        .header("Authorization", "Bearer " + invalidRefreshToken)
                        .contentType("application/json")
                        .content("{}")
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void refreshToken_withExpiredToken_shouldReturn401() throws Exception {
        // Este teste requer criar um token que já expirou
        // Pode ser feito via reflexão alterando o tempo de expiração
        // Deixar para implementação futura com MockTime
    }
}
