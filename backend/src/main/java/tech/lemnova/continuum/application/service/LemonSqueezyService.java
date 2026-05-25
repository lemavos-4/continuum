package tech.lemnova.continuum.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tech.lemnova.continuum.application.exception.BadRequestException;
import tech.lemnova.continuum.controller.dto.subscription.CheckoutResponse;

import java.util.Map;

@Service
public class LemonSqueezyService {

    private static final Logger log = LoggerFactory.getLogger(LemonSqueezyService.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String apiKey;
    private final String storeId;
    private final String successUrl;
    private final String cancelUrl;
    private final String variantVision;

    public LemonSqueezyService(
            @Value("${lemonsqueezy.api.key}") String apiKey,
            @Value("${lemonsqueezy.store.id}") String storeId,
            @Value("${lemonsqueezy.checkout.success.url}") String successUrl,
            @Value("${lemonsqueezy.checkout.cancel.url}") String cancelUrl,
            @Value("${lemonsqueezy.variant.vision}") String variantVision) {
        this.apiKey = apiKey;
        this.storeId = storeId;
        this.successUrl = successUrl;
        this.cancelUrl = cancelUrl;
        this.variantVision = variantVision;
        this.restTemplate = new RestTemplate();
    }

    public CheckoutResponse createCheckout(String userId, String email, String priceOrPlan) {
        String variantId = resolveVariantId(priceOrPlan);
        if (variantId == null || variantId.isBlank()) {
            throw new BadRequestException("Invalid Lemon Squeezy plan or variant: " + priceOrPlan);
        }

        // Lemon Squeezy "create checkout" payload — the correct way to attach
        // a per-user identifier that comes back in webhooks is
        // attributes.checkout_data.custom.user_id (NOT attributes.metadata).
        // The variant_id must live under relationships.variant.data, and
        // the store_id under relationships.store.data.
        Map<String, Object> body = Map.of(
                "data", Map.of(
                        "type", "checkouts",
                        "attributes", Map.of(
                                "checkout_data", Map.of(
                                        "email", email == null ? "" : email,
                                        "custom", Map.of("user_id", userId)
                                ),
                                "product_options", Map.of(
                                        "redirect_url", successUrl
                                )
                        ),
                        "relationships", Map.of(
                                "store", Map.of("data", Map.of("type", "stores", "id", storeId)),
                                "variant", Map.of("data", Map.of("type", "variants", "id", variantId))
                        )
                )
        );


        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<String> responseEntity = restTemplate.postForEntity(
                "https://api.lemonsqueezy.com/v1/checkouts",
                request,
                String.class
        );

        String responseBody = responseEntity.getBody();
        if (!responseEntity.getStatusCode().is2xxSuccessful()) {
            log.error("Lemon Squeezy checkout failed: status={} body={}", responseEntity.getStatusCode(), responseBody);
            throw new RuntimeException("Failed to create Lemon Squeezy checkout");
        }

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode attributes = root.path("data").path("attributes");
            String url = firstNonBlank(
                    attributes.path("url").asText(null),
                    attributes.path("checkout_url").asText(null)
            );
            if (url == null || url.isBlank()) {
                log.error("Lemon Squeezy checkout creation returned invalid response: {}", responseBody);
                throw new RuntimeException("Failed to create Lemon Squeezy checkout");
            }
            return new CheckoutResponse(null, url);
        } catch (Exception e) {
            log.error("Failed to parse Lemon Squeezy checkout response", e);
            throw new RuntimeException("Failed to create Lemon Squeezy checkout", e);
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return null;
    }

    private String resolveVariantId(String value) {
        if (value == null || value.isBlank()) return null;
        if (value.startsWith("var_")) return value;
        return switch (value.toUpperCase()) {
            case "VISION" -> variantVision;
            default -> null;
        };
    }

    public static class LemonSqueezyCheckoutResponse {
        private LemonSqueezyCheckoutData data;

        public LemonSqueezyCheckoutData getData() {
            return data;
        }

        public void setData(LemonSqueezyCheckoutData data) {
            this.data = data;
        }
    }

    public static class LemonSqueezyCheckoutData {
        private LemonSqueezyCheckoutAttributes attributes;

        public LemonSqueezyCheckoutAttributes getAttributes() {
            return attributes;
        }

        public void setAttributes(LemonSqueezyCheckoutAttributes attributes) {
            this.attributes = attributes;
        }
    }

    public static class LemonSqueezyCheckoutAttributes {
        private String url;

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }
    }
}
