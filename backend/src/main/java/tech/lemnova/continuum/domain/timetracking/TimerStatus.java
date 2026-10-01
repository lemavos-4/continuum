package tech.lemnova.continuum.domain.timetracking;

/**
 * Status of a timer session
 */
public enum TimerStatus {
    /**
     * Timer is currently running
     */
    RUNNING,

    /**
     * Timer was stopped and time was logged
     */
    COMPLETED,

    /**
     * Timer was abandoned without logging time
     */
    ABANDONED
}
