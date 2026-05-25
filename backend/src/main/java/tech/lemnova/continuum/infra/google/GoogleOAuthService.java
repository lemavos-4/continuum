package tech.lemnova.continuum.infra.google;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.application.exception.BadRequestException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

@Service
public class GoogleOAuthService {

    private static final String GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
    private static final String GOOGLE_ISSUER = "https://accounts.google.com";
    private static final String GOOGLE_ISSUER_ALT = "accounts.google.com";

    private final String clientId;
    private final String clientSecret;
    private final NetHttpTransport transport = new NetHttpTransport();
    private final GsonFactory gsonFactory = GsonFactory.getDefaultInstance();

    public GoogleOAuthService(@Value("${google.oauth.client-id}") String clientId,
                              @Value("${google.oauth.client-secret}") String clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public String buildAuthorizationUrl(String redirectUri, String state, String nonce) {
        try {
            return GOOGLE_AUTH_URI +
                    "?response_type=code" +
                    "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8) +
                    "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) +
                    "&scope=" + URLEncoder.encode("openid email profile", StandardCharsets.UTF_8) +
                    "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8) +
                    "&nonce=" + URLEncoder.encode(nonce, StandardCharsets.UTF_8) +
                    "&prompt=consent" +
                    "&access_type=offline" +
                    "&include_granted_scopes=true";
        } catch (Exception e) {
            throw new BadRequestException("Unable to build Google authorization URL");
        }
    }

    public GoogleUserInfo exchangeCodeForUserInfo(String authorizationCode, String redirectUri, String expectedNonce) {
        try {
            GoogleTokenResponse tokenResponse = new GoogleAuthorizationCodeTokenRequest(
                    transport,
                    gsonFactory,
                    GOOGLE_TOKEN_URI,
                    clientId,
                    clientSecret,
                    authorizationCode,
                    redirectUri)
                    .execute();

            GoogleIdToken idToken = tokenResponse.parseIdToken();
            if (idToken == null) {
                throw new BadRequestException("Google code exchange did not return a valid id_token");
            }

            GoogleIdToken.Payload payload = verifyIdTokenPayload(idToken, expectedNonce);

            return new GoogleUserInfo(
                    payload.getSubject(),
                    payload.getEmail(),
                    (String) payload.get("name"),
                    (String) payload.get("picture"),
                    Boolean.TRUE.equals(payload.getEmailVerified())
            );
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Failed to exchange Google authorization code: " + extractRootCauseMessage(e));
        }
    }

    private GoogleIdToken.Payload verifyIdTokenPayload(GoogleIdToken idToken, String expectedNonce) throws Exception {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(transport, gsonFactory)
                .setAudience(Collections.singletonList(clientId))
                .build();

        if (!verifier.verify(idToken)) {
            throw new BadRequestException("Invalid Google ID token");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        if (expectedNonce != null && !expectedNonce.isBlank()) {
            Object nonceClaim = payload.get("nonce");
            if (nonceClaim == null || !expectedNonce.equals(nonceClaim.toString())) {
                throw new BadRequestException("Invalid Google ID token nonce");
            }
        }

        if (payload.getExpirationTimeSeconds() == null || payload.getExpirationTimeSeconds() * 1000 < System.currentTimeMillis()) {
            throw new BadRequestException("Expired Google ID token");
        }

        String issuer = payload.getIssuer();
        if (!GOOGLE_ISSUER.equals(issuer) && !GOOGLE_ISSUER_ALT.equals(issuer)) {
            throw new BadRequestException("Invalid Google ID token issuer");
        }

        if (payload.getAudience() == null || !payload.getAudience().equals(clientId)) {
            throw new BadRequestException("Google ID token audience mismatch");
        }

        return payload;
    }

    private String extractRootCauseMessage(Exception e) {
        Throwable cause = e;
        while (cause.getCause() != null) {
            cause = cause.getCause();
        }
        return cause.getMessage() != null ? cause.getMessage() : e.toString();
    }

    public record GoogleUserInfo(
            String googleId,
            String email,
            String name,
            String picture,
            Boolean emailVerified
    ) {}
}