package tech.lemnova.continuum.application.exception;

/**
 * Exceção lançada quando há erro ao fazer refresh do token.
 * Possíveis causas:
 * - Token expirado
 * - Token inválido ou não encontrado
 * - Token foi revogado
 * - Usuário não existe mais
 */
public class TokenRefreshException extends RuntimeException {
    
    private final String errorCode;

    public TokenRefreshException(String message) {
        super(message);
        this.errorCode = "TOKEN_REFRESH_FAILED";
    }

    public TokenRefreshException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    public TokenRefreshException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "TOKEN_REFRESH_FAILED";
    }

    public TokenRefreshException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
