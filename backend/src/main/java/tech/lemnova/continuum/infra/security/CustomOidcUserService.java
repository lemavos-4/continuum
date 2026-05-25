package tech.lemnova.continuum.infra.security;

import org.springframework.context.annotation.Lazy; // Importação necessária
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.application.service.AuthService;
import tech.lemnova.continuum.application.exception.BadRequestException;

@Service
public class CustomOidcUserService extends OidcUserService {

    private final AuthService authService;

    // Adicionamos o @Lazy aqui para resolver a referência circular
    public CustomOidcUserService(@Lazy AuthService authService) {
        this.authService = authService;
    }

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);
        String email = oidcUser.getEmail();
        
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Google login requires a verified email");
        }

        authService.upsertGoogleUser(
                oidcUser.getSubject(),
                email,
                oidcUser.getFullName(),
                oidcUser.getEmailVerified(),
                (String) oidcUser.getAttributes().get("picture")
        );

        return oidcUser;
    }
}
