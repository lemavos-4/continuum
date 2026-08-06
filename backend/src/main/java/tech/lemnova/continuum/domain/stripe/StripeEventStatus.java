package tech.lemnova.continuum.domain.stripe;

/** Lifecycle of a Stripe webhook event inside our system. */
public enum StripeEventStatus {
    /** Claimed by a worker, business logic still running. */
    PROCESSING,
    /** Fully applied — safe to acknowledge duplicates immediately. */
    PROCESSED,
    /** Handler blew up — eligible for webhook retry and for the reconciliation job. */
    FAILED
}
