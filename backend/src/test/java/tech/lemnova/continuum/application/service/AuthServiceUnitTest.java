package tech.lemnova.continuum.application.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import tech.lemnova.continuum.domain.token.TokenBlacklistRepository;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.plan.PlanType;
import tech.lemnova.continuum.domain.subscription.SubscriptionRepository;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.security.JwtService;
import tech.lemnova.continuum.infra.vault.VaultStorageService;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceUnitTest {

    @Mock
    UserRepository users;

    @Mock
    SubscriptionRepository subscriptions;

    @Mock
    TokenBlacklistRepository tokenBlacklistRepo;

    @Mock
    PasswordEncoder passwordEncoder;

    @Mock
    JwtService jwtService;

    @Mock
    VaultStorageService vaultStorage;

    @Mock
    PlanConfiguration planConfig;

    @InjectMocks
    AuthService authService;

    @Captor
    ArgumentCaptor<User> userCaptor;

    @BeforeEach
    void setup() {
        // nothing
    }

    @Test
    void upsertGoogleUser_createsNewUserWithVaultIdAndAvatarUrl() {
        String googleId = "g123";
        String email = "newuser@example.com";
        String name = "New User";
        Boolean emailVerified = true;
        String avatarUrl = "https://example.com/avatar.jpg";

        when(users.findByEmail(email)).thenReturn(Optional.empty());
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User result = authService.upsertGoogleUser(googleId, email, name, emailVerified, avatarUrl);

        assertThat(result.getEmail()).isEqualTo(email);
        assertThat(result.getGoogleId()).isEqualTo(googleId);
        assertThat(result.getAvatarUrl()).isEqualTo(avatarUrl);
        assertThat(result.getVaultId()).isNotNull();
        assertThat(result.getVaultId()).isNotBlank();
        assertThat(result.getActive()).isTrue();
        assertThat(result.isEmailVerified()).isTrue();
    }
}
