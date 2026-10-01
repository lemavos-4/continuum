package tech.lemnova.continuum.infra.notification;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.function.BiConsumer;

/**
 * Minimal Telegram Bot API client. One instance per bot (token + target chat).
 *
 * Intentionally dependency-free and non-blocking: every send is fired through
 * {@link HttpClient#sendAsync} so notifications never slow down a request.
 */
public class TelegramBotClient {

    private static final String API_BASE = "https://api.telegram.org/bot";

    private final String botToken;
    private final String chatId;
    private final HttpClient httpClient;

    public TelegramBotClient(String botToken, String chatId) {
        this(botToken, chatId, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
    }

    public TelegramBotClient(String botToken, String chatId, HttpClient httpClient) {
        this.botToken = botToken == null ? "" : botToken.trim();
        this.chatId = chatId == null ? "" : chatId.trim();
        this.httpClient = httpClient;
    }

    public boolean isConfigured() {
        return !botToken.isBlank() && !chatId.isBlank();
    }

    /**
     * Sends a message using Telegram's HTML parse mode. Text longer than the
     * Telegram limit (4096 chars) is truncated.
     */
    public CompletableFuture<HttpResponse<String>> sendMessage(String text) {
        return sendMessage(text, null);
    }

    public CompletableFuture<HttpResponse<String>> sendMessage(String text, BiConsumer<Integer, String> onFailure) {
        if (!isConfigured()) {
            return CompletableFuture.completedFuture(null);
        }

        String safeText = text == null ? "" : text;
        if (safeText.length() > 4000) {
            safeText = safeText.substring(0, 3990) + "\n…";
        }

        String payload = "{\"chat_id\":\"" + escapeJson(chatId) + "\","
                + "\"text\":\"" + escapeJson(safeText) + "\","
                + "\"parse_mode\":\"HTML\","
                + "\"disable_web_page_preview\":true}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE + botToken + "/sendMessage"))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                .build();

        CompletableFuture<HttpResponse<String>> future = httpClient.sendAsync(
                request,
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

        return future.whenComplete((response, throwable) -> {
            if (onFailure == null) {
                return;
            }
            if (throwable != null) {
                onFailure.accept(-1, rootMessage(throwable));
                return;
            }
            if (!isSuccessful(response)) {
                onFailure.accept(response == null ? -1 : response.statusCode(),
                        response == null ? "no response" : response.body());
            }
        });
    }

    /** Blocking send used by diagnostics so the caller sees Telegram's answer. */
    public SendResult sendSync(String text) {
        if (!isConfigured()) {
            return new SendResult(false, -1, "bot not configured (missing token or chat id)");
        }
        try {
            HttpResponse<String> response = sendMessage(text).join();
            int status = response == null ? -1 : response.statusCode();
            String body = response == null ? "no response" : response.body();
            boolean ok = isSuccessful(response);
            return new SendResult(ok, status, body);
        } catch (Exception e) {
            return new SendResult(false, -1, rootMessage(e));
        }
    }

    private static boolean isSuccessful(HttpResponse<String> response) {
        if (response == null || response.statusCode() < 200 || response.statusCode() >= 300) {
            return false;
        }
        String body = response.body();
        return body != null && body.replaceAll("\\s+", "").contains("\"ok\":true");
    }

    private static String rootMessage(Throwable throwable) {
        Throwable current = throwable;
        while ((current instanceof CompletionException || current.getCause() != null)
                && current.getCause() != null) {
            current = current.getCause();
        }
        return current.getMessage() == null ? current.getClass().getSimpleName() : current.getMessage();
    }

    /** Non-sensitive description of this bot's configuration. */
    public String describe() {
        if (botToken.isBlank() && chatId.isBlank()) {
            return "token=missing chatId=missing";
        }
        return "token=" + (botToken.isBlank() ? "missing" : "set(len=" + botToken.length() + ")")
                + " chatId=" + (chatId.isBlank() ? "missing" : "set");
    }

    public record SendResult(boolean ok, int status, String body) {}

    /** Escapes HTML special chars so user-provided content can't break markup. */
    public static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    static String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder(value.length() + 16);
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '"' -> sb.append("\\\"");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }
}
