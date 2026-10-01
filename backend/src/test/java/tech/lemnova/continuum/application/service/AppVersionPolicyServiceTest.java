package tech.lemnova.continuum.application.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AppVersionPolicyServiceTest {

    private AppVersionPolicyService policy(String latest, String minimum) {
        return new AppVersionPolicyService(latest, minimum, "https://example.com/apk", "");
    }

    @Test
    void normalizesVersions() {
        assertEquals("2.0.100", AppVersionPolicyService.normalize("v2.0.100"));
        assertEquals("", AppVersionPolicyService.normalize("build-20260907-120000"));
        assertEquals("", AppVersionPolicyService.normalize(null));
    }

    @Test
    void blocksClientsBelowMinimum() {
        AppVersionPolicyService p = policy("v2.0.100", "v2.0.0");
        assertTrue(p.isBlocked("1.9.9"));
        assertFalse(p.isBlocked("2.0.0"));
        assertFalse(p.isBlocked("2.0.100"));
    }

    @Test
    void neverBlocksUnknownVersions() {
        AppVersionPolicyService p = policy("v2.0.100", "v2.0.0");
        assertFalse(p.isBlocked("dev"));
        assertFalse(p.isBlocked(null));
    }

    @Test
    void flagsOptionalUpdates() {
        AppVersionPolicyService p = policy("v2.0.100", "v2.0.0");
        assertTrue(p.isOutdated("2.0.5"));
        assertFalse(p.isOutdated("2.0.100"));
        assertTrue(p.isConfigured());
    }

    @Test
    void isInertWhenUnconfigured() {
        AppVersionPolicyService p = policy("", "");
        assertFalse(p.isConfigured());
        assertFalse(p.isBlocked("1.0.0"));
        assertFalse(p.isOutdated("1.0.0"));
    }
}
