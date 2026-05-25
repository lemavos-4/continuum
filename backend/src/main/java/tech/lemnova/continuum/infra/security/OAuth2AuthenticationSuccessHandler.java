package tech.lemnova.continuum.infra.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy; // Importação essencial
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import tech.lemnova.continuum.application.service.AuthService;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final AuthService authService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    // Adicionamos o @Lazy aqui também porque esta classe faz parte do nó
    // de dependência que o Spring Config tenta montar no início.
    public OAuth2AuthenticationSuccessHandler(@Lazy AuthService authService, JwtService jwtService, UserRepository userRepository) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OidcUser oidcUser = (OidcUser) authentication.getPrincipal();
        String email = oidcUser.getEmail();

        // Buscar o usuário no banco para obter vaultId
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found after OAuth2 login"));

        JwtService.TokenPair tokenPair = jwtService.generateTokenPair(
                user.getId().toString(),
                user.getUsername(),
                user.getEmail(),
                user.getVaultId()
        );

        String redirectUrl = frontendUrl + "/#/?access_token=" + URLEncoder.encode(tokenPair.accessToken(), StandardCharsets.UTF_8) +
                "&refresh_token=" + URLEncoder.encode(tokenPair.refreshToken(), StandardCharsets.UTF_8) +
                "&vault_id=" + URLEncoder.encode(user.getVaultId(), StandardCharsets.UTF_8);

        System.out.println("OAuth2 Success Handler: Redirecting to: " + redirectUrl);
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
