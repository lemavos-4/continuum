package tech.lemnova.continuum.infra.notification;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.ThrowableProxyUtil;
import ch.qos.logback.core.AppenderBase;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;
import java.time.Instant;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Bot #2 — backend/server observability. Streams application logs
 * (WARN/ERROR by default) plus lifecycle events to a dedicated Telegram chat.
 *
 * Configure with TELEGRAM_LOGS_BOT_TOKEN + TELEGRAM_LOGS_CHAT_ID.
 * Optional: TELEGRAM_LOGS_MIN_LEVEL (TRACE|DEBUG|INFO|WARN|ERROR, default WARN).
 */
@Service
public class TelegramLogService {

    private final TelegramBotClient bot;
    private final Level minLevel;
    private final String appName;
    private final Environment environment;

    private final BlockingQueue<String> queue = new ArrayBlockingQueue<>(500);
    private final AtomicBoolean running = new AtomicBoolean(false);
    private Thread worker;
    private LogbackBridge appender;

    public TelegramLogService(
            @Value("${telegram.logs.bot-token:${TELEGRAM_LOGS_BOT_TOKEN:}}") String botToken,
            @Value("${telegram.logs.chat-id:${TELEGRAM_LOGS_CHAT_ID:}}") String chatId,
            @Value("${telegram.logs.min-level:${TELEGRAM_LOGS_MIN_LEVEL:WARN}}") String minLevel,
            @Value("${spring.application.name:continuum-backend}") String appName,
            Environment environment) {
        this.bot = new TelegramBotClient(botToken, chatId);
        this.minLevel = Level.toLevel(minLevel == null ? "WARN" : minLevel.trim(), Level.WARN);
        this.appName = appName;
        this.environment = environment;
    }

    public boolean isConfigured() {
        return bot.isConfigured();
    }

    public String describe() {
        return bot.describe() + " minLevel=" + minLevel;
    }

    /** Blocking test send used by the diagnostics endpoint. */
    public TelegramBotClient.SendResult sendTest() {
        return bot.sendSync("\u2705 <b>Teste do bot de logs</b>\n\ud83d\udd52 " + Instant.now());
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        if (!bot.isConfigured()) {
            System.out.println("[telegram-logs] NOT configured (" + bot.describe()
                    + "). Set TELEGRAM_LOGS_BOT_TOKEN and TELEGRAM_LOGS_CHAT_ID.");
            return;
        }
        System.out.println("[telegram-logs] configured (" + bot.describe() + " minLevel=" + minLevel + ")");
        startWorker();
        attachAppender();
        String profiles = String.join(", ", environment.getActiveProfiles());
        enqueue("🟢 <b>" + esc(appName) + " online</b>\n"
                + "profiles: " + (profiles.isBlank() ? "default" : esc(profiles)) + "\n"
                + "port: " + esc(environment.getProperty("server.port", "8080")) + "\n"
                + "level: " + minLevel + "\n"
                + "🕒 " + Instant.now());
    }

    @EventListener(ContextClosedEvent.class)
    public void onShutdown() {
        if (!bot.isConfigured()) {
            return;
        }
        // Sent synchronously: the JVM may exit before an async send completes.
        TelegramBotClient.SendResult result = bot.sendSync(
                "🔴 <b>" + esc(appName) + " offline</b>\n🕒 " + Instant.now());
        if (!result.ok()) {
            System.err.println("[telegram-logs] shutdown notification failed: status="
                    + result.status() + " body=" + result.body());
        }
    }

    /** Manual hook for ad-hoc server notifications from application code. */
    public void notifyServerEvent(String title, String details) {
        if (!bot.isConfigured()) {
            return;
        }
        enqueue("📣 <b>" + esc(title) + "</b>\n" + esc(details));
    }

    private void startWorker() {
        if (!running.compareAndSet(false, true)) {
            return;
        }
        worker = new Thread(this::drainLoop, "telegram-log-sender");
        worker.setDaemon(true);
        worker.start();
    }

    private void attachAppender() {
        if (!(LoggerFactory.getILoggerFactory() instanceof ch.qos.logback.classic.LoggerContext ctx)) {
            return;
        }
        appender = new LogbackBridge();
        appender.setContext(ctx);
        appender.setName("telegram-log-bridge");
        appender.start();
        ctx.getLogger(ch.qos.logback.classic.Logger.ROOT_LOGGER_NAME).addAppender(appender);
    }

    private void drainLoop() {
        while (running.get()) {
            try {
                String first = queue.poll(1, TimeUnit.SECONDS);
                if (first == null) {
                    continue;
                }
                TelegramBotClient.SendResult result = bot.sendSync(first);
                if (!result.ok()) {
                    System.err.println("[telegram-logs] send failed: status="
                            + result.status() + " body=" + result.body());
                }
                // Telegram allows ~1 msg/sec per chat.
                Thread.sleep(1200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                // Never log here: it would feed back into this appender.
                System.err.println("[telegram-logs] send failed: " + e.getMessage());
            }
        }
    }

    private void enqueue(String message) {
        if (!queue.offer(message)) {
            System.err.println("[telegram-logs] queue full; dropping notification");
        }
    }

    @PreDestroy
    public void stop() {
        running.set(false);
        if (appender != null) {
            appender.stop();
        }
        if (worker != null) {
            worker.interrupt();
        }
    }

    private static String esc(String value) {
        return TelegramBotClient.escapeHtml(value);
    }

    private String format(ILoggingEvent event) {
        String icon = switch (event.getLevel().toInt()) {
            case Level.ERROR_INT -> "🚨";
            case Level.WARN_INT -> "⚠️";
            default -> "ℹ️";
        };

        StringBuilder sb = new StringBuilder();
        sb.append(icon).append(" <b>").append(event.getLevel()).append("</b> · ")
                .append(esc(shortLogger(event.getLoggerName()))).append('\n')
                .append("<code>").append(esc(event.getFormattedMessage())).append("</code>");

        IThrowableProxy throwable = event.getThrowableProxy();
        if (throwable != null) {
            String stack = ThrowableProxyUtil.asString(throwable);
            if (stack.length() > 1200) {
                stack = stack.substring(0, 1200) + "\n…";
            }
            sb.append("\n<pre>").append(esc(stack)).append("</pre>");
        }
        return sb.toString();
    }

    private static String shortLogger(String name) {
        if (name == null) {
            return "unknown";
        }
        int idx = name.lastIndexOf('.');
        return idx < 0 ? name : name.substring(idx + 1);
    }

    /** Logback appender that funnels events into the Telegram queue. */
    private class LogbackBridge extends AppenderBase<ILoggingEvent> {
        @Override
        protected void append(ILoggingEvent event) {
            if (!event.getLevel().isGreaterOrEqual(minLevel)) {
                return;
            }
            // Avoid infinite loops from our own failure logging.
            String logger = event.getLoggerName();
            if (logger != null && logger.startsWith("tech.lemnova.continuum.infra.notification.Telegram")) {
                return;
            }
            enqueue(format(event));
        }
    }
}
