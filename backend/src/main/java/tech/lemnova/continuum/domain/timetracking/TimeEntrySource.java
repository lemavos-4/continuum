package tech.lemnova.continuum.domain.timetracking;

/**
 * Indicates the source of a time entry
 */
public enum TimeEntrySource {
    /**
     * Entry was created from an active timer session
     */
    TIMER,

    /**
     * Entry was manually created by the user
     */
    MANUAL,

    /**
     * Entry was recovered from an interrupted session
     */
    RECOVERED
}
