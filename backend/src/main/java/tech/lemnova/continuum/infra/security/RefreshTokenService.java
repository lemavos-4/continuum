package tech.lemnova.continuum.infra.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.lemnova.continuum.application.exception.NotFoundException;
import tech.lemnova.continuum.application.exception.TokenRefreshException;
import tech.lemnova.continuum.domain.token.RefreshToken;
import tech.lemnova.continuum.domain.token.RefreshTokenRepository;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;

import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Serviço para gerenciar Refresh Tokens com segurança.
 * 
 * Responsabilidades:
 * - Gerar novo refresh token
 * - Validar e recuperar refresh token
 * - Rotação de tokens (opcional)
 * - Revogação de tokens
 * - Logout (delete de todos os tokens do usuário)
 * - Limpeza automática de tokens expirados
 * 
 * Segurança:
 * - Valida assinatura JWT
 * - Verifica expiração
 * - Verifica revogação
 * - Garante que o token pertence ao usuário correto
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.refresh-token.expiration:604800000}")
    private long refreshTokenExpirationMs;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
                              UserRepository userRepository,
                              JwtService jwtService) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    /**
     * Gera um novo Refresh Token para um usuário.
     * Salva no banco de dados para auditoria e validação futura.
     * 
     * @param userId ID do usuário
     * @param clientInfo Informação do cliente (IP, User-Agent) para auditoria
     * @return Token JWT de refresh
     */
    @Transactional
    public String generateRefreshToken(String userId, String clientInfo) {
        log.debug("Gerando refresh token para usuário: {}", userId);

        // Valida que o usuário existe
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));

        // Gera token JWT
        String token = jwtService.generateRefreshToken(
                userId,
                user.getUsername(),
                user.getEmail(),
                user.getVaultId()
        );

        // Calcula a data de expiração
        Instant expiryDate = Instant.now().plus(
                refreshTokenExpirationMs / 1000,
                ChronoUnit.SECONDS
        );

        // Salva o token no banco de dados
        RefreshToken refreshToken = RefreshToken.builder()
                .token(token)
                .userId(userId)
                .expiryDate(expiryDate)
                .clientInfo(clientInfo)
                .build();

        refreshTokenRepository.save(refreshToken);
        log.info("Refresh token gerado e salvo para usuário: {}", userId);

        return token;
    }

    /**
     * Valida um Refresh Token e retorna os dados do token.
     * Realiza múltiplas validações de segurança:
     * 1. Verifica se a assinatura JWT é válida
     * 2. Verifica se não está expirado
     * 3. Verifica se não foi revogado
     * 4. Garante que existe no banco de dados
     * 
     * @param token Token JWT de refresh
     * @return Claims contendo dados do token (userId, email, etc)
     * @throws TokenRefreshException se o token for inválido, expirado ou revogado
     */
    public Claims validateRefreshToken(String token) {
        log.debug("Validando refresh token");

        try {
            // 1. Valida a assinatura e recupera claims
            Key key = getSigningKey();
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            // 2. Verifica se é um token de refresh (não access token)
            String tokenType = (String) claims.get("type");
            if (!"refresh".equals(tokenType)) {
                throw new TokenRefreshException(
                        "Token não é um refresh token válido",
                        "INVALID_TOKEN_TYPE"
                );
            }

            String userId = claims.get("userId", String.class);

            // 3. Busca no banco de dados
            RefreshToken storedToken = refreshTokenRepository.findByToken(token)
                    .orElseThrow(() -> new TokenRefreshException(
                            "Refresh token não encontrado no banco de dados",
                            "TOKEN_NOT_FOUND"
                    ));

            // 4. Verifica se foi revogado
            if (storedToken.getRevokedAt() != null) {
                throw new TokenRefreshException(
                        "Refresh token foi revogado",
                        "TOKEN_REVOKED"
                );
            }

            // 5. Verifica se está expirado
            if (storedToken.isExpired()) {
                throw new TokenRefreshException(
                        "Refresh token expirado",
                        "TOKEN_EXPIRED"
                );
            }

            // 6. Verifica que o userId do token corresponde ao do banco
            if (!userId.equals(storedToken.getUserId())) {
                log.warn("Tentativa de usar refresh token de outro usuário. Token: {}, Banco: {}",
                        userId, storedToken.getUserId());
                throw new TokenRefreshException(
                        "Token não pertence a este usuário",
                        "TOKEN_USER_MISMATCH"
                );
            }

            log.info("Refresh token validado com sucesso para usuário: {}", userId);
            return claims;

        } catch (ExpiredJwtException e) {
            log.warn("Refresh token expirado: {}", e.getMessage());
            throw new TokenRefreshException(
                    "Refresh token expirado",
                    "TOKEN_EXPIRED",
                    e
            );
        } catch (SignatureException e) {
            log.warn("Assinatura inválida no refresh token: {}", e.getMessage());
            throw new TokenRefreshException(
                    "Assinatura de token inválida",
                    "INVALID_SIGNATURE",
                    e
            );
        } catch (TokenRefreshException e) {
            throw e; // Re-lança exceções do nosso domínio
        } catch (Exception e) {
            log.error("Erro ao validar refresh token: {}", e.getMessage(), e);
            throw new TokenRefreshException(
                    "Erro ao validar refresh token: " + e.getMessage(),
                    "TOKEN_VALIDATION_ERROR",
                    e
            );
        }
    }

    /**
     * Revoga um Refresh Token específico (logout).
     * Marca como revogado no banco para auditoria.
     * 
     * @param token Token JWT a ser revogado
     */
    @Transactional
    public void revokeToken(String token) {
        log.info("Revogando refresh token");

        RefreshToken storedToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new TokenRefreshException(
                        "Token não encontrado",
                        "TOKEN_NOT_FOUND"
                ));

        storedToken.revoke();
        refreshTokenRepository.save(storedToken);

        log.info("Refresh token revogado para usuário: {}", storedToken.getUserId());
    }

    /**
     * Revoga TODOS os tokens de um usuário (logout de todas as sessões).
     * Útil para logout completo ou quando a senha foi alterada.
     * 
     * @param userId ID do usuário
     */
    @Transactional
    public void revokeAllUserTokens(String userId) {
        log.info("Revogando todos os refresh tokens do usuário: {}", userId);

        var tokens = refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId);
        tokens.forEach(RefreshToken::revoke);
        refreshTokenRepository.saveAll(tokens);

        log.info("Todos os refresh tokens do usuário foram revogados: {}", userId);
    }

    /**
     * Deleta um refresh token (limpeza física do banco).
     * Use após confirmar que está revogado.
     * 
     * @param token Token a deletar
     */
    @Transactional
    public void deleteToken(String token) {
        refreshTokenRepository.findByToken(token).ifPresent(
                storedToken -> {
                    refreshTokenRepository.deleteById(storedToken.getId());
                    log.info("Refresh token deletado para usuário: {}", storedToken.getUserId());
                }
        );
    }

    /**
     * Deleta todos os tokens de um usuário (limpeza completa).
     * 
     * @param userId ID do usuário
     */
    @Transactional
    public void deleteAllUserTokens(String userId) {
        long deleted = refreshTokenRepository.deleteByUserId(userId);
        log.info("Deletados {} refresh tokens do usuário: {}", deleted, userId);
    }

    /**
     * Limpeza de tokens expirados (pode ser executada periodicamente).
     * 
     * @return número de tokens deletados
     */
    @Transactional
    public long cleanupExpiredTokens() {
        log.info("Limpando refresh tokens expirados");
        long deleted = refreshTokenRepository.deleteByExpiryDateBefore(Instant.now());
        log.info("Deletados {} refresh tokens expirados", deleted);
        return deleted;
    }

    /**
     * Gera um novo access token usando dados do refresh token válido.
     * 
     * @param refreshTokenClaims Claims do refresh token já validado
     * @return Novo Access Token JWT
     */
    public String generateAccessTokenFromRefresh(Claims refreshTokenClaims) {
        String userId = refreshTokenClaims.get("userId", String.class);
        String username = refreshTokenClaims.get("username", String.class);
        String email = refreshTokenClaims.get("email", String.class);
        String vaultId = refreshTokenClaims.get("vaultId", String.class);

        return jwtService.generateAccessToken(userId, username, email, vaultId);
    }

    /**
     * Recupera a chave de assinatura para validar JWT
     * (método auxiliar, pode ser melhorado passando como parâmetro)
     */
    private Key getSigningKey() {
        return io.jsonwebtoken.security.Keys.hmacShaKeyFor(secret.getBytes());
    }
}
