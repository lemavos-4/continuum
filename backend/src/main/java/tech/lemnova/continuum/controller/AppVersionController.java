package tech.lemnova.continuum.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.lemnova.continuum.application.service.AppVersionPolicyService;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Public version policy endpoint. Called by the client on every app start, so
 * updates surface immediately instead of after a polling interval.
 */
@RestController
@RequestMapping("/api/app-version")
public class AppVersionController {

    private final AppVersionPolicyService policy;

    public AppVersionController(AppVersionPolicyService policy) {
        this.policy = policy;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> get(
        @RequestHeader(value = "X-App-Version", required = false) String clientVersion
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("latestVersion", policy.latestVersion());
        body.put("minimumVersion", policy.minimumVersion());
        body.put("updateUrl", policy.updateUrl());
        body.put("notes", policy.updateNotes());
        body.put("clientVersion", AppVersionPolicyService.normalize(clientVersion));
        body.put("mandatory", policy.isBlocked(clientVersion));
        body.put("outdated", policy.isOutdated(clientVersion));
        return ResponseEntity.ok()
            .header("Cache-Control", "no-store")
            .body(body);
    }
}
