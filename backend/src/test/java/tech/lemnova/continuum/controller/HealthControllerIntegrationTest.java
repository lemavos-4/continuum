package tech.lemnova.continuum.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;
import tech.lemnova.continuum.infra.vault.VaultStorageService;
import tech.lemnova.continuum.infra.email.EmailService;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthControllerIntegrationTest {

    @MockBean VaultStorageService vaultStorageService;
    @MockBean EmailService emailService;

    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;

    @Test
    void healthEndpointReturnsOk() {
        ResponseEntity<String> resp = rest.getForEntity(
                "http://localhost:" + port + "/health", String.class);
        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
    }
}
