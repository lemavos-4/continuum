package tech.lemnova.continuum.infra.vault;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "vault.b2")
public class VaultConfig {
    private String endpoint;
    private String bucketName;
    private String accessKey;
    private String secretKey;
    private String region;
}
