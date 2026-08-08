package tech.lemnova.continuum.infra.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.ZoneId;

/** Binds the caller timezone (sent by the client) to the current request thread. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TimeZoneFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            ZoneId zone = RequestZone.parse(request.getHeader("X-Timezone"), request.getHeader("X-TZ-Offset"));
            RequestZone.set(zone);
            chain.doFilter(request, response);
        } finally {
            RequestZone.clear();
        }
    }
}
