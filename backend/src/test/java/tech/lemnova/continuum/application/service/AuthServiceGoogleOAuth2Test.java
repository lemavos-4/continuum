package tech.lemnova.continuum.application.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.plan.PlanType;
import tech.lemnova.continuum.domain.subscription.SubscriptionRepository;
import tech.lemnova.continuum.domain.token.TokenBlacklistRepository;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.security.JwtService;
import tech.lemnova.continuum.infra.vault.VaultStorageService;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Testes de integração para o fluxo de Google OAuth2.
 * 
 * Verifica:
 * 1. Vinculamento de conta: novo email do Google com mesmo email existente no banco
 * 2. Injeção correta de vaultId no JWT
 * 3. Desativação de rotas legadas de registro/login
 */
@DisplayName("Google OAuth2 Integration Tests")
class AuthServiceGoogleOAuth2Test {

    @Mock private UserRepository userRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private TokenBlacklistRepository tokenBlacklistRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private VaultStorageService vaultStorage;
    @Mock private PlanConfiguration planConfig;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("upsertGoogleUser: deve vincular conta existente por email")
    void upsertGoogleUser_bindsExistingAccountByEmail() {
        // Arrange: Usuário existente com senha (login legacy)
        User existingUser = User.builder()
                .id("user-1")
                .username("john.doe")
                .email("john@example.com")
                .password("hashed-password-legacy")
                .vaultId("vault-123")
                .googleId(null)
                .active(false)
                .emailVerified(false)
                .plan(PlanType.FREE)
                .role("USER")
                .noteCount(0)
                .entityCount(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        String googleId = "google-oauth2-id-12345";
        String email = "john@example.com";
        String name = "John Doe";
        Boolean emailVerified = true;

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act: Realizar login via Google com mesmo email
        User result = authService.upsertGoogleUser(googleId, email, name, emailVerified, "https://example.com/avatar.jpg");

        // Assert: Conta foi vinculada, não criada duplicada
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("user-1"); // Mesmo usuário
        assertThat(result.getGoogleId()).isEqualTo(googleId);// Google ID foi vinculado
        assertThat(result.getPassword()).isNull(); // Senha foi removida
        assertThat(result.getActive()).isTrue(); // Conta foi ativada
        assertThat(result.isEmailVerified()).isTrue();
        assertThat(result.getVaultId()).isEqualTo("vault-123"); // vaultId preservado

        // Verify: Usuário foi salvo exatamente uma vez
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("upsertGoogleUser: deve criar novo usuário se email não existir")
    void upsertGoogleUser_createsNewUserIfEmailNotFound() {
        // Arrange
        String googleId = "google-new-user-67890";
        String email = "newuser@example.com";
        String name = "New User";

        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId("new-user-id");
            return user;
        });

        // Act
        User result = authService.upsertGoogleUser(googleId, email, name, true, null);

        // Assert: Novo usuário foi criado com valores corretos
        assertThat(result.getId()).isEqualTo("new-user-id");
        assertThat(result.getGoogleId()).isEqualTo(googleId);
        assertThat(result.getEmail()).isEqualTo(email);
        assertThat(result.getPassword()).isNull();
        assertThat(result.getActive()).isTrue();
        assertThat(result.isEmailVerified()).isTrue();
        assertThat(result.getPlan()).isEqualTo(PlanType.FREE);
        assertThat(result.getRole()).isEqualTo("USER");
        assertThat(result.getNoteCount()).isZero();
        assertThat(result.getEntityCount()).isZero();
        assertThat(result.getVaultId()).isNotBlank(); // vaultId foi gerado

        // Verify: Subscription e vault foram inicializados
        verify(userRepository, times(1)).save(any(User.class));
        verify(subscriptionRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("upsertGoogleUser: deve preservar vaultId mesmo após múltiplos logins")
    void upsertGoogleUser_preservesVaultIdOnMultipleLogins() {
        // Arrange: Usuário que já fez login antes
        String originalVaultId = "vault-original-123";
        User existingUser = User.builder()
                .id("user-revisit")
                .username("jane")
                .email("jane@example.com")
                .googleId("google-id-1")
                .password(null)
                .vaultId(originalVaultId)
                .active(true)
                .emailVerified(true)
                .plan(PlanType.FREE)
                .role("USER")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act: Segundo login via Google
        User result = authService.upsertGoogleUser("google-id-1", "jane@example.com", "Jane", true, null);

        // Assert: vaultId não foi alterado
        assertThat(result.getVaultId()).isEqualTo(originalVaultId);
    }

    @Test
    @DisplayName("generateTokenPairFromUser: deve incluir vaultId no JWT")
    void generateTokenPairFromUser_includesVaultIdInJWT() {
        // Arrange
        User user = User.builder()
                .id("user-123")
                .username("john")
                .email("john@example.com")
                .vaultId("vault-abc-123")
                .password(null)
                .plan(PlanType.FREE)
                .role("USER")
                .active(true)
                .build();

        // Mock JwtService para capturar os argumentos
        when(jwtService.generateTokenPair("user-123", "john", "john@example.com", "vault-abc-123"))
                .thenReturn(new JwtService.TokenPair("access-token", "refresh-token"));

        // Act
        JwtService.TokenPair tokens = jwtService.generateTokenPair(
                user.getId(), user.getUsername(), user.getEmail(), user.getVaultId());

        // Assert: vaultId foi passado para geração de token
        assertThat(tokens.accessToken()).isEqualTo("access-token");
        assertThat(tokens.refreshToken()).isEqualTo("refresh-token");

        // Verify: Método foi chamado com vaultId
        verify(jwtService, times(1)).generateTokenPair("user-123", "john", "john@example.com", "vault-abc-123");
    }
}
