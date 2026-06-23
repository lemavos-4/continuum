package tech.lemnova.continuum.application.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.lemnova.continuum.application.exception.BadRequestException;
import tech.lemnova.continuum.application.exception.NotFoundException;
import tech.lemnova.continuum.controller.dto.auth.AuthResponse;
import tech.lemnova.continuum.controller.dto.auth.UserContextResponse;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.plan.PlanType;
import tech.lemnova.continuum.domain.subscription.Subscription;
import tech.lemnova.continuum.domain.subscription.SubscriptionRepository;
import tech.lemnova.continuum.domain.subscription.SubscriptionStatus;
import tech.lemnova.continuum.domain.token.TokenBlacklist;
import tech.lemnova.continuum.domain.token.TokenBlacklistRepository;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.security.JwtService;
import tech.lemnova.continuum.infra.security.RefreshTokenService;
import tech.lemnova.continuum.infra.vault.VaultStorageService;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.Date;
import java.util.UUID;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository users;
    private final SubscriptionRepository subscriptions;
    private final TokenBlacklistRepository tokenBlacklistRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final VaultStorageService vaultStorage;
    private final PlanConfiguration planConfig;

    public AuthService(UserRepository users,
                       SubscriptionRepository subscriptions,
                       TokenBlacklistRepository tokenBlacklistRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       RefreshTokenService refreshTokenService,
                       VaultStorageService vaultStorage,
                       PlanConfiguration planConfig) {
        this.users = users;
        this.subscriptions = subscriptions;
        this.tokenBlacklistRepository = tokenBlacklistRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.vaultStorage = vaultStorage;
        this.planConfig = planConfig;
    }

    @Transactional
    public User upsertGoogleUser(String googleId, String email, String name, Boolean emailVerified, String avatarUrl) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Google login requires an email");
        }

        User user = users.findByEmail(email).orElse(null);
        if (user == null) {
            String vaultId = UUID.randomUUID().toString().replace("-", "");
            String username = name != null && !name.isBlank() ? name : email.split("@")[0].replaceAll("[^a-zA-Z0-9]", "");
            user = User.builder()
                    .username(username)
                    .email(email)
                    .googleId(googleId)
                    .avatarUrl(avatarUrl)
                    .password(null)
                    .active(true)
                    .emailVerified(Boolean.TRUE.equals(emailVerified))
                    .role("USER")
                    .plan(PlanType.FREE)
                    .vaultId(vaultId)
                    .entityCount(0)
                    .noteCount(0)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            user = users.save(user);
            createFreeSubscription(user.getId());
            initVaultAsync(vaultId);
        } else {
            boolean changed = false;
            if (user.getGoogleId() == null) {
                user.setGoogleId(googleId);
                changed = true;
            }
            if (avatarUrl != null && !avatarUrl.isBlank() && (user.getAvatarUrl() == null || user.getAvatarUrl().isBlank())) {
                user.setAvatarUrl(avatarUrl);
                changed = true;
            }
            if (!Boolean.TRUE.equals(user.getActive())) {
                user.setActive(true);
                changed = true;
            }
            if (!Boolean.TRUE.equals(user.isEmailVerified())) {
                user.setEmailVerified(true);
                changed = true;
            }
            if (user.getPassword() != null) {
                user.setPassword(null);
                changed = true;
            }
            if ((user.getUsername() == null || user.getUsername().isBlank()) && name != null && !name.isBlank()) {
                user.setUsername(name);
                changed = true;
            }
            if (changed) {
                user.setUpdatedAt(Instant.now());
                user = users.save(user);
            }
        }
        return user;
    }

    @Transactional
    public AuthResponse googleAuth(String googleId, String email, String name, Boolean emailVerified, String avatarUrl) {
        boolean isNew = users.findByEmail(email).isEmpty();
        User user = upsertGoogleUser(googleId, email, name, emailVerified, avatarUrl);
        return buildAuthResponseWithTokenPair(user).withNewUserFlag(isNew);
    }

    @Transactional
    public AuthResponse googleAuth(tech.lemnova.continuum.infra.google.GoogleOAuthService.GoogleUserInfo googleUser) {
        boolean isNew = users.findByEmail(googleUser.email()).isEmpty();
        User user = upsertGoogleUser(googleUser.googleId(), googleUser.email(), googleUser.name(), googleUser.emailVerified(), googleUser.picture());
        return buildAuthResponseWithTokenPair(user).withNewUserFlag(isNew);
    }


    @Transactional
    public AuthResponse register(String username, String email, String password) {
        if (email == null || email.isBlank()) throw new BadRequestException("Email is required");
        if (users.existsByEmail(email)) throw new BadRequestException("Email already in use");
        if (users.existsByUsername(username)) throw new BadRequestException("Username already in use");
        String vaultId = UUID.randomUUID().toString().replace("-", "");
        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role("USER")
                .active(true)
                .emailVerified(true)
                .plan(PlanType.FREE)
                .vaultId(vaultId)
                .entityCount(0)
                .noteCount(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        user = users.save(user);
        createFreeSubscription(user.getId());
        initVaultAsync(vaultId);
        return buildAuthResponseWithTokenPair(user).withNewUserFlag(true);
    }

    @Transactional
    public AuthResponse login(String email, String password) {
        User user = users.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));
        if (user.getPassword() == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new BadRequestException("Account is not active");
        }
        return buildAuthResponseWithTokenPair(user);
    }

    /**
     * Revoga todos os tokens do usuário (logout).
     * Atualiza lastLogoutAt para invalidar tokens anteriores.
     */
    @Transactional
    public void logout(String userId, String accessToken, String refreshToken) {
        log.info("Logout for user: {}", userId);
        
        User user = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        user.setLastLogoutAt(Instant.now());
        users.save(user);
        
        // Revogar Access Token se fornecido
        if (accessToken != null && jwtService.isValid(accessToken)) {
            String jti = jwtService.extractJti(accessToken);
            if (jti != null) {
                long expirationMs = jwtService.getTimeUntilExpiration(accessToken);
                Instant expiresAt = Instant.now().plus(expirationMs, ChronoUnit.MILLIS);
                TokenBlacklist blacklistEntry = new TokenBlacklist(jti, userId, JwtService.TOKEN_TYPE_ACCESS, expiresAt);
                tokenBlacklistRepository.save(blacklistEntry);
            }
        }
        
        // Revogar Refresh Token se fornecido
        if (refreshToken != null && jwtService.isValid(refreshToken)) {
            String jti = jwtService.extractJti(refreshToken);
            if (jti != null) {
                long expirationMs = jwtService.getTimeUntilExpiration(refreshToken);
                Instant expiresAt = Instant.now().plus(expirationMs, ChronoUnit.MILLIS);
                TokenBlacklist blacklistEntry = new TokenBlacklist(jti, userId, JwtService.TOKEN_TYPE_REFRESH, expiresAt);
                tokenBlacklistRepository.save(blacklistEntry);
            }
        }
    }

    /**
     * Versão simplificada de logout.
     * Atualiza lastLogoutAt para invalidar todos os tokens anteriores.
     */
    @Transactional
    public void logout(String userId) {
        log.info("Logout for user: {} (all tokens will be invalidated via lastLogoutAt)", userId);
        User user = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        user.setLastLogoutAt(Instant.now());
        users.save(user);
    }

    @Transactional
    public void updateUsername(String userId, String username) {
        User user = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        user.setUsername(username);
        user.setUpdatedAt(Instant.now());
        users.save(user);
    }

    public UserContextResponse getContext(String userId) {
        User user = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        List<Subscription> subs = subscriptions.findAllByUserId(userId);
        Subscription sub = (subs == null || subs.isEmpty()) ? null : subs.stream()
                .max(Comparator.comparing(s -> s.getCurrentPeriodEnd() == null ? Instant.EPOCH : s.getCurrentPeriodEnd()))
                .orElse(null);
        PlanType effectivePlan = sub != null ? sub.getEffectivePlan() : user.getPlan();
        return UserContextResponse.from(user, sub, planConfig.getLimits(effectivePlan));
    }

    @Async
    public void initVaultAsync(String vaultId) {
        try { 
            vaultStorage.initializeVault(vaultId); 
        } catch (Exception e) {
            log.error("Erro ao inicializar vault {}: {}", vaultId, e.getMessage());
        }
    }

    private void createFreeSubscription(String userId) {
        Subscription sub = Subscription.builder()
                .userId(userId).planType(PlanType.FREE).status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now()).currentPeriodEnd(Instant.now().plus(36500, ChronoUnit.DAYS)).build();
        subscriptions.save(sub);
    }

    /**
     * Constrói AuthResponse com TokenPair (Access + Refresh).
     */
    private AuthResponse buildAuthResponseWithTokenPair(User user) {
        // Access token (curta duração) gerado diretamente.
        String accessToken = jwtService.generateFromUser(user);
        // Refresh token (longa duração) gerado E persistido no banco para que
        // o endpoint /api/auth/refresh consiga validá-lo depois. Sem isso o
        // refresh falha com TOKEN_NOT_FOUND.
        String refreshToken = refreshTokenService.generateRefreshToken(user.getId(), "login");
        return AuthResponse.withTokenPair(
            accessToken,
            refreshToken,
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getPlan()
        );
    }

    /**
     * Constrói AuthResponse com apenas 1 token (compatibilidade com código antigo).
     */
    private AuthResponse buildAuthResponse(User user) {
        return new AuthResponse(jwtService.generateFromUser(user), user.getId(), user.getUsername(), user.getEmail(), user.getPlan());
    }
}