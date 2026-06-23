package tech.lemnova.continuum.infra.security;

import jakarta.servlet.http.HttpServletResponse; // Import necessário para o EntryPoint
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final SecurityHeadersFilter securityHeadersFilter;
    private final CustomOidcUserService oidcUserService;
    private final OAuth2AuthenticationSuccessHandler oauth2SuccessHandler;

    @Value("${cors.allowed.origins:*}")
    private String corsAllowedOrigins;

    @Value("${app.dev-mode:false}")
    private boolean appDevMode;

    @Value("${frontend.url:${app.url:http://localhost:5173}}")
    private String frontendUrl;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, RateLimitingFilter rateLimitingFilter, 
                         SecurityHeadersFilter securityHeadersFilter,
                         CustomOidcUserService oidcUserService,
                         OAuth2AuthenticationSuccessHandler oauth2SuccessHandler) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.rateLimitingFilter = rateLimitingFilter;
        this.securityHeadersFilter = securityHeadersFilter;
        this.oidcUserService = oidcUserService;
        this.oauth2SuccessHandler = oauth2SuccessHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            // Desativa login por formulário padrão do Spring
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                // Crucial: Retorna JSON em vez de tentar redirecionar para login HTML
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"Unauthorized\", \"message\": \"" + authException.getMessage() + "\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/", "/health", "/error", "/actuator/**").permitAll()
                // Public authentication endpoints
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/google/callback").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/google/url").permitAll()
                // Allow Stripe webhook endpoint unauthenticated so Stripe can POST events
                .requestMatchers(HttpMethod.POST, "/api/webhooks/stripe").permitAll()
                // Swagger / Docs
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-resources/**", "/webjars/**").permitAll()
                // Qualquer outra requisição precisa de JWT
                .anyRequest().authenticated()
            )
            // Filtros na ordem correta
            .addFilterBefore(securityHeadersFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        List<String> allowedOrigins = parseAllowedOrigins(corsAllowedOrigins);
        if (allowedOrigins.isEmpty()) {
            // Safe defaults — production domains + Lovable preview wildcards.
            // Override via CORS_ALLOWED_ORIGINS env var (comma separated).
            allowedOrigins = Arrays.asList(
                "https://appcontinuum.vercel.app",
                "https://continuumnodes.lovable.app",
                "https://backend-continuum.onrender.com",
                "https://*.lovable.app",
                "https://*.lovableproject.com",
                "https://*.vercel.app",
                "http://localhost:5173",
                "http://localhost:8080"
            );
        }

        if (appDevMode) {
            // Dev: allow any origin pattern (still credential-safe via patterns API).
            config.setAllowedOriginPatterns(Collections.singletonList("*"));
        } else {
            // Use patterns (not origins) so wildcards like *.lovable.app work with credentials.
            config.setAllowedOriginPatterns(allowedOrigins);
        }

        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setExposedHeaders(Arrays.asList("Authorization", "Content-Disposition"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private List<String> parseAllowedOrigins(String origins) {
        if (origins == null || origins.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(origins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());
    }

    @Bean
    public PasswordEncoder passwordEncoder() { 
        return new BCryptPasswordEncoder(); 
    }
}