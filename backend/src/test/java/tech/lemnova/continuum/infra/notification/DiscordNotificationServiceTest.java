package tech.lemnova.continuum.infra.notification;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DiscordNotificationServiceTest {

    @Mock
    private HttpClient httpClient;

    @Mock
    private CompletableFuture<HttpResponse<String>> future;

    @Mock
    private HttpResponse<String> httpResponse;

    private DiscordNotificationService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new DiscordNotificationService("https://discord.com/api/webhooks/fakeid/faketoken", httpClient);
    }

    @Test
    void notifyNewUser_buildsCorrectDiscordPayload() {
        when(httpClient.sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(future);

        service.notifyNewUser("João Silva", "joao@example.com");

        ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient, times(1)).sendAsync(requestCaptor.capture(), any(HttpResponse.BodyHandler.class));

        HttpRequest request = requestCaptor.getValue();
        assertThat(request.uri()).isEqualTo(URI.create("https://discord.com/api/webhooks/fakeid/faketoken"));
        assertThat(request.method()).isEqualTo("POST");
        assertThat(request.headers().firstValue("Content-Type")).contains("application/json");

        String body = request.bodyPublisher()
                .orElseThrow(() -> new AssertionError("BodyPublisher is missing"));

        assertThat(readBody(body)).isEqualTo("{\"content\":\"🎉 Novo usuário: João Silva (joao@example.com)\"}");
    }

    private String readBody(java.net.http.HttpRequest.BodyPublisher publisher) {
        var byteArrayOutputStream = new java.io.ByteArrayOutputStream();
        CountDownLatch latch = new CountDownLatch(1);

        publisher.subscribe(new Flow.Subscriber<ByteBuffer>() {
            @Override
            public void onSubscribe(Flow.Subscription subscription) {
                subscription.request(Long.MAX_VALUE);
            }

            @Override
            public void onNext(ByteBuffer item) {
                try {
                    byte[] chunk = new byte[item.remaining()];
                    item.get(chunk);
                    byteArrayOutputStream.write(chunk);
                } catch (java.io.IOException e) {
                    throw new RuntimeException(e);
                }
            }

            @Override
            public void onError(Throwable throwable) {
                latch.countDown();
                throw new RuntimeException(throwable);
            }

            @Override
            public void onComplete() {
                latch.countDown();
            }
        });

        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }

        return byteArrayOutputStream.toString(StandardCharsets.UTF_8);
    }
}
