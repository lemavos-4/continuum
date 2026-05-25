package tech.lemnova.continuum;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ContinuumApplication {
    public static void main(String[] args) {
        SpringApplication.run(ContinuumApplication.class, args);
    }
}
