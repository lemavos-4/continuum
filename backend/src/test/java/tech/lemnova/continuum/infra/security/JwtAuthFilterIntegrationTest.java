package tech.lemnova.continuum.infra.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testes de integração para JwtAuthFilter.
 * Valida autenticação JWT em endpoints protegidos.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class JwtAuthFilterIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    private User testUser;
    private String validAccessToken;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        testUser = new User();
        testUser.setEmail("jwttest@example.com");
        testUser.setUsername("jwtuser");
        testUser.setVaultId("vault-jwt-123");
        testUser.setActive(true);
        testUser = userRepository.save(testUser);

        validAccessToken = jwtService.generateAccessToken(
                testUser.getId(),
                testUser.getUsername(),
                testUser.getEmail(),
                testUser.getVaultId()
        );
    }

    @Test
    void withValidToken_shouldAccessProtectedEndpoint() throws Exception {
        mockMvc.perform(
                get("/api/auth/me")
                        .header("Authorization", "Bearer " + validAccessToken)
        ).andExpect(status().isOk());
    }

    @Test
    void withoutToken_shouldReturn401() throws Exception {
        mockMvc.perform(
                get("/api/auth/me")
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void withInvalidToken_shouldReturn401() throws Exception {
        mockMvc.perform(
                get("/api/auth/me")
                        .header("Authorization", "Bearer invalid.token.here")
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void withMalformedAuthHeader_shouldReturn401() throws Exception {
        mockMvc.perform(
                get("/api/auth/me")
                        .header("Authorization", "InvalidFormat " + validAccessToken)
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void withNoUserInDatabase_shouldReturn401() throws Exception {
        // Criar token para usuário que não existe no DB
        String orphanToken = jwtService.generateAccessToken(
                "nonexistent-user-id",
                "nonexistent",
                "nonexistent@example.com",
                "nonexistent-vault"
        );

        mockMvc.perform(
                get("/api/auth/me")
                        .header("Authorization", "Bearer " + orphanToken)
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void publicEndpoints_shouldNotRequireToken() throws Exception {
        mockMvc.perform(
                get("/health")
        ).andExpect(status().isOk());
    }

    @Test
    void refreshEndpoint_shouldPermitWithoutToken() throws Exception {
        // /auth/refresh é permitido sem Bearer token, mas pode usar refresh token
        mockMvc.perform(
                get("/oauth2/authorization/google")
        ).andExpect(status().isFound()); // Redirect para Google
    }
}
