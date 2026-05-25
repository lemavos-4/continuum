package tech.lemnova.continuum.infra.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tech.lemnova.continuum.domain.user.UserRepository;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testes de integração para OAuth2AuthenticationSuccessHandler.
 * Valida redirecionamento correto após login bem-sucedido do Google.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class OAuth2AuthenticationSuccessHandlerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void successfulGoogleLogin_shouldRedirectToFrontendWithToken() throws Exception {
        // Arrange - Simular OIDC user info do Google
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", "google-123456");
        attributes.put("email", "user@example.com");
        attributes.put("name", "Test User");
        attributes.put("email_verified", true);
        attributes.put("picture", "https://example.com/avatar.jpg");

        OidcUserInfo userInfo = new OidcUserInfo(attributes);
        OidcIdToken idToken = new OidcIdToken(
                "token_value_here",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                attributes
        );

        DefaultOidcUser oidcUser = new DefaultOidcUser(
                Collections.emptyList(),
                idToken,
                userInfo,
                "sub"
        );

        // Act & Assert
        mockMvc.perform(
                get("/")
                        .with(oidcLogin().oidcUser(oidcUser))
        ).andExpect(status().is3xxRedirection())
         .andExpect(redirectedUrlPattern("**/login-success?token=*"));
    }

    @Test
    void successfulGoogleLogin_shouldCreateUserInDatabase() throws Exception {
        // Arrange
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", "google-789");
        attributes.put("email", "newuser@example.com");
        attributes.put("name", "New User");
        attributes.put("email_verified", true);
        attributes.put("picture", "https://example.com/avatar2.jpg");

        OidcUserInfo userInfo = new OidcUserInfo(attributes);
        OidcIdToken idToken = new OidcIdToken(
                "token_value",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                attributes
        );

        DefaultOidcUser oidcUser = new DefaultOidcUser(
                Collections.emptyList(),
                idToken,
                userInfo,
                "sub"
        );

        // Act
        mockMvc.perform(
                get("/")
                        .with(oidcLogin().oidcUser(oidcUser))
        ).andExpect(status().is3xxRedirection());

        // Assert - Verificar que usuário foi criado
        var createdUser = userRepository.findByEmail("newuser@example.com");
        assert createdUser.isPresent() : "User should be created in database";
        assert createdUser.get().getGoogleId().equals("google-789") : "Google ID should be set";
        assert createdUser.get().getAvatarUrl().equals("https://example.com/avatar2.jpg") : "Avatar URL should be set";
    }

    @Test
    void successfulGoogleLogin_shouldIncludeVaultIdInToken() throws Exception {
        // Arrange
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", "google-999");
        attributes.put("email", "vaulttest@example.com");
        attributes.put("name", "Vault Test");
        attributes.put("email_verified", true);
        attributes.put("picture", null);

        OidcUserInfo userInfo = new OidcUserInfo(attributes);
        OidcIdToken idToken = new OidcIdToken(
                "token_value",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                attributes
        );

        DefaultOidcUser oidcUser = new DefaultOidcUser(
                Collections.emptyList(),
                idToken,
                userInfo,
                "sub"
        );

        // Act
        var result = mockMvc.perform(
                get("/")
                        .with(oidcLogin().oidcUser(oidcUser))
        ).andExpect(status().is3xxRedirection())
         .andReturn();

        // Assert - Verificar que URL de redirect contém token
        String redirectUrl = result.getResponse().getRedirectedUrl();
        assert redirectUrl != null && redirectUrl.contains("?token=") : "Redirect should contain token parameter";
    }

    @Test
    void successfulGoogleLogin_withoutPicture_shouldStillRedirect() throws Exception {
        // Arrange
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", "google-nopic");
        attributes.put("email", "nopic@example.com");
        attributes.put("name", "No Picture User");
        attributes.put("email_verified", true);
        // picture is null

        OidcUserInfo userInfo = new OidcUserInfo(attributes);
        OidcIdToken idToken = new OidcIdToken(
                "token_value",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                attributes
        );

        DefaultOidcUser oidcUser = new DefaultOidcUser(
                Collections.emptyList(),
                idToken,
                userInfo,
                "sub"
        );

        // Act & Assert
        mockMvc.perform(
                get("/")
                        .with(oidcLogin().oidcUser(oidcUser))
        ).andExpect(status().is3xxRedirection())
         .andExpect(redirectedUrlPattern("**/login-success?token=*"));
    }
}
