package tech.lemnova.continuum.infra.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;

@Service
public class DiscordNotificationService {

    private static final Logger log = LoggerFactory.getLogger(DiscordNotificationService.class);

    private final String webhookUrl;
    private final HttpClient httpClient;

    public DiscordNotificationService(@Value("${discord.webhook-url:${DISCORD_WEBHOOK_URL:}}") String webhookUrl) {
        this.webhookUrl = webhookUrl == null ? "" : webhookUrl.trim();
        this.httpClient = HttpClient.newHttpClient();
    }

    public void notifyNewUser(String nome, String email) {
        if (webhookUrl.isBlank()) {
            log.warn("Discord webhook URL not configured (DISCORD_WEBHOOK_URL). Skipping notification for user {} <{}>", nome, email);
            return;
        }

        String content = String.format("🎉 Novo usuário: %s (%s)", nome, email);
        String payload = "{\"content\":\"" + escapeJson(content) + "\"}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(webhookUrl))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                .build();

        CompletableFuture<HttpResponse<String>> future = httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        future.whenComplete((response, throwable) -> {
            if (throwable != null) {
                log.error("Falha ao enviar notificação Discord para novo usuário {} <{}>: {}", nome, email, throwable.getMessage());
                return;
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("Discord webhook retornou status {} para novo usuário {} <{}>. Response body: {}",
                        response.statusCode(), nome, email, response.body());
            }
        });
    }

    private static String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
