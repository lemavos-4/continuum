package tech.lemnova.continuum.infra.web;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Per-request timezone of the caller.
 *
 * The backend runs in UTC, but "today" must be resolved in the user's own
 * timezone, otherwise activities/tracking flip a day too early or too late for
 * anyone that is not on UTC.
 */
public final class RequestZone {

    private static final ThreadLocal<ZoneId> CURRENT = new ThreadLocal<>();

    private RequestZone() {}

    public static void set(ZoneId zone) {
        if (zone != null) CURRENT.set(zone);
    }

    public static void clear() {
        CURRENT.remove();
    }

    /** Caller timezone, falling back to UTC when unknown (e.g. scheduled jobs). */
    public static ZoneId get() {
        ZoneId z = CURRENT.get();
        return z != null ? z : ZoneOffset.UTC;
    }

    public static LocalDate today() {
        return LocalDate.now(get());
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(get());
    }

    /** Parses an IANA zone name, or an offset in minutes east of UTC. */
    public static ZoneId parse(String zoneHeader, String offsetMinutesHeader) {
        if (zoneHeader != null && !zoneHeader.isBlank()) {
            try {
                return ZoneId.of(zoneHeader.trim());
            } catch (Exception ignored) { /* fall through */ }
        }
        if (offsetMinutesHeader != null && !offsetMinutesHeader.isBlank()) {
            try {
                int minutes = Integer.parseInt(offsetMinutesHeader.trim());
                if (minutes > -841 && minutes < 841) {
                    return ZoneOffset.ofTotalSeconds(minutes * 60);
                }
            } catch (Exception ignored) { /* fall through */ }
        }
        return null;
    }
}
