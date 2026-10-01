package tech.lemnova.continuum.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Server-side app version policy.
 *
 * The server is the single source of truth for which client version is current
 * and which versions are still allowed to run:
 *
 *  - APP_LATEST_VERSION   latest published client (e.g. 1.2.3)
 *  - APP_MINIMUM_VERSION  oldest version still allowed; anything below it is blocked
 *  - APP_UPDATE_URL       where the client should download the new build
 *  - APP_UPDATE_NOTES     optional short message shown in the update dialog
 *
 * Optional updates (patches) can be dismissed by the user. An update becomes
 * mandatory simply by raising APP_MINIMUM_VERSION to the released version.
 */
@Service
public class AppVersionPolicyService {

    private static final Pattern SEMVER = Pattern.compile("^v?(\\d+)\\.(\\d+)\\.(\\d+)$");

    private final String latestVersion;
    private final String minimumVersion;
    private final String updateUrl;
    private final String updateNotes;

    public AppVersionPolicyService(
        @Value("${app.version.latest:}") String latestVersion,
        @Value("${app.version.minimum:}") String minimumVersion,
        @Value("${app.version.update-url:}") String updateUrl,
        @Value("${app.version.notes:}") String updateNotes
    ) {
        this.latestVersion = normalize(latestVersion);
        this.minimumVersion = normalize(minimumVersion);
        this.updateUrl = updateUrl == null ? "" : updateUrl.trim();
        this.updateNotes = updateNotes == null ? "" : updateNotes.trim();
    }

    public String latestVersion() {
        return latestVersion;
    }

    public String minimumVersion() {
        return minimumVersion;
    }

    public String updateUrl() {
        return updateUrl;
    }

    public String updateNotes() {
        return updateNotes;
    }

    /** True when the policy is configured well enough to be enforced. */
    public boolean isConfigured() {
        return !latestVersion.isEmpty();
    }

    /** True when the client version is strictly below the configured minimum. */
    public boolean isBlocked(String clientVersion) {
        if (minimumVersion.isEmpty()) return false;
        String client = normalize(clientVersion);
        if (client.isEmpty()) return false; // unknown/dev clients are never blocked
        return compare(client, minimumVersion) < 0;
    }

    /** True when a newer version exists (optional update). */
    public boolean isOutdated(String clientVersion) {
        if (latestVersion.isEmpty()) return false;
        String client = normalize(clientVersion);
        if (client.isEmpty()) return false;
        return compare(client, latestVersion) < 0;
    }

    /** "1.2.3" for any accepted input, or "" when the value is not stable semver. */
    public static String normalize(String raw) {
        if (raw == null) return "";
        Matcher m = SEMVER.matcher(raw.trim());
        if (!m.matches()) return "";
        return Integer.parseInt(m.group(1)) + "." + Integer.parseInt(m.group(2)) + "." + Integer.parseInt(m.group(3));
    }

    /** Semantic comparison of two normalized versions. */
    public static int compare(String a, String b) {
        String[] left = a.split("\\.");
        String[] right = b.split("\\.");
        for (int i = 0; i < 3; i++) {
            int diff = Integer.parseInt(left[i]) - Integer.parseInt(right[i]);
            if (diff != 0) return diff;
        }
        return 0;
    }
}
