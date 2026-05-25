package tech.lemnova.continuum.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import tech.lemnova.continuum.infra.vault.VaultStorageService;
import tech.lemnova.continuum.infra.email.EmailService;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class FolderControllerPresenceTest {

    @MockBean VaultStorageService vaultStorageService;
    @MockBean EmailService emailService;

    @Autowired(required = false) FolderController bean;

    @Test
    void beanIsPresent() {
        assertThat(bean).isNotNull();
    }
}
