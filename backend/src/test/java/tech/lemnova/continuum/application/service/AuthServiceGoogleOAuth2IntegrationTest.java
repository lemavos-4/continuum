package tech.lemnova.continuum.application.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tech.lemnova.continuum.controller.dto.auth.AuthResponse;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.security.JwtService;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testes para AuthService - GoogleOAuth2 flow.
 * Valida criação de usuários, account linking e JWT generation.
 */
@SpringBootTest
@ActiveProfiles("test")
class AuthServiceGoogleOAuth2IntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    private static final String GOOGLE_ID = "google-oauth2|123456789";
    private static final String EMAIL = "newuser@example.com";
    private static final String NAME = "New User";
    private static final String PICTURE_URL = "https://example.com/avatar.jpg";

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void googleAuth_shouldCreateNewUserWhenEmailNotExists() {
        // Act
        AuthResponse response = authService.googleAuth(GOOGLE_ID, EMAIL, NAME, true, PICTURE_URL);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.accessToken()).isNotNull();
        assertThat(response.refreshToken()).isNotNull();

        User createdUser = userRepository.findByEmail(EMAIL).orElse(null);
        assertThat(createdUser).isNotNull();
        assertThat(createdUser.getGoogleId()).isEqualTo(GOOGLE_ID);
        assertThat(createdUser.getAvatarUrl()).isEqualTo(PICTURE_URL);
        assertThat(createdUser.getActive()).isTrue();
        assertThat(createdUser.isEmailVerified()).isTrue();
        assertThat(createdUser.getPassword()).isNull();
    }

    @Test
    void googleAuth_shouldLinkGoogleToExistingPasswordUser() {
        // Arrange - Criar usuário com password (email/password auth antigo)
        User existingUser = new User();
        existingUser.setEmail(EMAIL);
        existingUser.setUsername("olduser");
        existingUser.setPassword("$2a$10$hashed_password");
        existingUser.setVaultId("vault-existing");
        existingUser.setActive(false);
        existingUser.setEmailVerified(false);
        userRepository.save(existingUser);

        // Act - Login com Google OAuth2 no mesmo email
        AuthResponse response = authService.googleAuth(GOOGLE_ID, EMAIL, NAME, true, PICTURE_URL);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.accessToken()).isNotNull();

        User linkedUser = userRepository.findByEmail(EMAIL).orElse(null);
        assertThat(linkedUser).isNotNull();
        assertThat(linkedUser.getId()).isEqualTo(existingUser.getId());
        assertThat(linkedUser.getGoogleId()).isEqualTo(GOOGLE_ID);
        assertThat(linkedUser.getPassword()).isNull();
        assertThat(linkedUser.getActive()).isTrue();
        assertThat(linkedUser.isEmailVerified()).isTrue();
        assertThat(linkedUser.getVaultId()).isEqualTo("vault-existing");
    }

    @Test
    void googleAuth_shouldPreserveAvatarUrlWhenAlreadySet() {
        // Arrange
        User existingUser = new User();
        existingUser.setEmail(EMAIL);
        existingUser.setUsername("user");
        existingUser.setAvatarUrl("https://old-avatar.com/pic.jpg");
        existingUser.setVaultId("vault-123");
        existingUser.setActive(true);
        userRepository.save(existingUser);

        // Act
        authService.googleAuth(GOOGLE_ID, EMAIL, NAME, true, PICTURE_URL);

        // Assert
        User updatedUser = userRepository.findByEmail(EMAIL).orElse(null);
        assertThat(updatedUser.getAvatarUrl()).isEqualTo("https://old-avatar.com/pic.jpg")
                .as("Should preserve existing avatar URL");
    }

    @Test
    void googleAuth_shouldUpdateAvatarUrlWhenNotSet() {
        // Arrange
        User existingUser = new User();
        existingUser.setEmail(EMAIL);
        existingUser.setUsername("user");
        existingUser.setAvatarUrl(null);
        existingUser.setVaultId("vault-123");
        existingUser.setActive(true);
        userRepository.save(existingUser);

        // Act
        authService.googleAuth(GOOGLE_ID, EMAIL, NAME, true, PICTURE_URL);

        // Assert
        User updatedUser = userRepository.findByEmail(EMAIL).orElse(null);
        assertThat(updatedUser.getAvatarUrl()).isEqualTo(PICTURE_URL);
    }

    @Test
    void googleAuth_shouldGenerateJwtWithVaultId() {
        // Act
        AuthResponse response = authService.googleAuth(GOOGLE_ID, EMAIL, NAME, true, PICTURE_URL);

        // Assert
        String accessToken = response.accessToken();
        String vaultId = jwtService.extractVaultId(accessToken);
        String email = jwtService.extractEmail(accessToken);

        assertThat(vaultId).isNotNull().isNotBlank();
        assertThat(email).isEqualTo(EMAIL);
    }

    @Test
    void googleAuth_shouldPreserveVaultIdOnConsecutiveLogins() {
        // Act - Primeiro login Google
        authService.googleAuth(GOOGLE_ID, EMAIL, NAME, true, PICTURE_URL);
        User userAfterFirstLogin = userRepository.findByEmail(EMAIL).orElse(null);
        String originalVaultId = userAfterFirstLogin.getVaultId();

        // Act - Segundo login Google (mesmo usuário)
        authService.googleAuth(GOOGLE_ID, EMAIL, NAME, true, PICTURE_URL);
        User userAfterSecondLogin = userRepository.findByEmail(EMAIL).orElse(null);

        // Assert
        assertThat(userAfterSecondLogin.getVaultId()).isEqualTo(originalVaultId)
                .as("vaultId should remain the same across logins");
    }

    @Test
    void googleAuth_shouldHandleNullPictureUrl() {
        // Act
        AuthResponse response = authService.googleAuth(GOOGLE_ID, EMAIL, NAME, true, null);

        // Assert
        assertThat(response).isNotNull();
        User createdUser = userRepository.findByEmail(EMAIL).orElse(null);
        assertThat(createdUser).isNotNull();
        assertThat(createdUser.getAvatarUrl()).isNull();
    }

    @Test
    void googleAuth_shouldGenerateDifferentJwtPerUser() {
        // Act
        AuthResponse response1 = authService.googleAuth(GOOGLE_ID, EMAIL, NAME, true, PICTURE_URL);
        AuthResponse response2 = authService.googleAuth("google-789", "other@example.com", "Other User", true, null);

        // Assert
        assertThat(response1.accessToken()).isNotEqualTo(response2.accessToken());

        String email1 = jwtService.extractEmail(response1.accessToken());
        String email2 = jwtService.extractEmail(response2.accessToken());

        assertThat(email1).isEqualTo(EMAIL);
        assertThat(email2).isEqualTo("other@example.com");
    }

    @Test
    void upsertGoogleUser_shouldGenerateUsernameFromEmailWhenNameEmpty() {
        // Act
        authService.googleAuth(GOOGLE_ID, "john.doe@example.com", "", true, PICTURE_URL);

        // Assert
        User user = userRepository.findByEmail("john.doe@example.com").orElse(null);
        assertThat(user.getUsername()).isNotNull().isNotBlank()
                .as("Username should be generated from email prefix");
    }
}
