package tech.lemnova.continuum.infra.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tech.lemnova.continuum.application.service.AppVersionPolicyService;

import java.io.IOException;

/**
 * Advertises the version policy on every API response and blocks native clients
 * running a version below the configured minimum with 426 Upgrade Required.
 *
 * Web clients are never hard-blocked: a browser reload always picks up the new
 * build, so blocking them would only lock people out.
 */
@Component
@Order(5)
public class AppVersionFilter extends OncePerRequestFilter {

    private final AppVersionPolicyService policy;

    public AppVersionFilter(AppVersionPolicyService policy) {
        this.policy = policy;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // The policy endpoint itself must stay reachable from blocked clients.
        return path.startsWith("/api/app-version") || !path.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {

        if (policy.isConfigured()) {
            response.setHeader("X-App-Latest-Version", policy.latestVersion());
            if (!policy.minimumVersion().isEmpty()) {
                response.setHeader("X-App-Minimum-Version", policy.minimumVersion());
            }
            if (!policy.updateUrl().isEmpty()) {
                response.setHeader("X-App-Update-Url", policy.updateUrl());
            }
        }

        String clientVersion = request.getHeader("X-App-Version");
        String platform = request.getHeader("X-App-Platform");
        boolean native_ = platform != null && !platform.isBlank() && !"web".equalsIgnoreCase(platform.trim());

        if (native_ && policy.isBlocked(clientVersion)) {
            response.setStatus(426); // Upgrade Required
            response.setContentType("application/json");
            response.setHeader("Cache-Control", "no-store");
            response.getWriter().write(
                "{\"error\":\"UPGRADE_REQUIRED\",\"minimumVersion\":\"" + policy.minimumVersion()
                    + "\",\"latestVersion\":\"" + policy.latestVersion()
                    + "\",\"updateUrl\":\"" + policy.updateUrl() + "\"}"
            );
            return;
        }

        chain.doFilter(request, response);
    }
}
