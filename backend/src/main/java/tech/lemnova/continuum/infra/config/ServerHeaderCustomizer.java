package tech.lemnova.continuum.infra.config;

import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Configuration;

/**
 * Configuração para ocultar informações sensíveis do servidor (header Server).
 * Previne que o Spring Boot exponha sua versão em headers de resposta.
 */
@Configuration
public class ServerHeaderCustomizer implements WebServerFactoryCustomizer<TomcatServletWebServerFactory> {

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        factory.addConnectorCustomizers(connector -> {
            connector.setProperty("server", "ContinuumServer");
        });
    }
}
