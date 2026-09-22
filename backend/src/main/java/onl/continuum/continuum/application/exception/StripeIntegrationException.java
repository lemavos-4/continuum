package onl.continuum.continuum.application.exception;

public class StripeIntegrationException extends RuntimeException {
    public StripeIntegrationException(String message, Throwable cause) {
        super(message, cause);
    }
}
