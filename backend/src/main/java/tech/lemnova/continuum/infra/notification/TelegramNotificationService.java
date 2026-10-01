package tech.lemnova.continuum.infra.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.http.HttpClient;
import java.time.Instant;
import java.util.concurrent.CompletableFuture;

/**
 * Bot #1 — product/business notifications (new signups).
 * Configure with TELEGRAM_NEWUSER_BOT_TOKEN + TELEGRAM_NEWUSER_CHAT_ID.
 */
@Service
public class TelegramNotificationService {

    private static final Logger log = LoggerFactory.getLogger(TelegramNotificationService.class);

    private final TelegramBotClient bot;

    @Autowired
    public TelegramNotificationService(
            @Value("${telegram.newuser.bot-token:${TELEGRAM_NEWUSER_BOT_TOKEN:}}") String botToken,
            @Value("${telegram.newuser.chat-id:${TELEGRAM_NEWUSER_CHAT_ID:}}") String chatId) {
        this(new TelegramBotClient(botToken, chatId));
    }

    public TelegramNotificationService(String botToken, String chatId, HttpClient httpClient) {
        this(new TelegramBotClient(botToken, chatId, httpClient));
    }

    TelegramNotificationService(TelegramBotClient bot) {
        this.bot = bot;
    }

    @jakarta.annotation.PostConstruct
    void logConfiguration() {
        if (bot.isConfigured()) {
            log.info("Telegram new-user bot configured ({})", bot.describe());
        } else {
            log.warn("Telegram new-user bot NOT configured ({}). Set TELEGRAM_NEWUSER_BOT_TOKEN and TELEGRAM_NEWUSER_CHAT_ID.", bot.describe());
        }
    }

    public boolean isConfigured() {
        return bot.isConfigured();
    }

    public String describe() {
        return bot.describe();
    }

    /** Blocking test send used by the diagnostics endpoint. */
    public TelegramBotClient.SendResult sendTest() {
        return bot.sendSync("\u2705 <b>Teste do bot de novos usuarios</b>\n\ud83d\udd52 " + Instant.now());
    }

    public CompletableFuture<Boolean> notifyNewUser(String name, String email) {
        if (!bot.isConfigured()) {
            log.warn("Telegram new-user bot not configured (TELEGRAM_NEWUSER_BOT_TOKEN / TELEGRAM_NEWUSER_CHAT_ID). Skipping notification for {} <{}>", name, email);
            return CompletableFuture.completedFuture(false);
        }

        String message = "🎉 <b>Novo usuário</b>\n"
                + "👤 " + TelegramBotClient.escapeHtml(name) + "\n"
                + "✉️ " + TelegramBotClient.escapeHtml(email) + "\n"
                + "🕒 " + Instant.now();

        log.info("Enviando notificação Telegram de novo usuário {} <{}>", name, email);
        return bot.sendMessage(message, (status, body) ->
                log.error("Falha ao enviar notificação Telegram (novo usuário {} <{}>): status={} body={}", name, email, status, body))
                .thenApply(response -> response != null
                        && response.statusCode() >= 200
                        && response.statusCode() < 300
                        && response.body() != null
                        && response.body().replaceAll("\\s+", "").contains("\"ok\":true"))
                .exceptionally(error -> false);
    }
}
