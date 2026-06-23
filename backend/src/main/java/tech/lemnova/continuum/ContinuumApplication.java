package tech.lemnova.continuum;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

import java.util.TimeZone;

@SpringBootApplication
@EnableAsync
public class ContinuumApplication {

    // Force the whole backend to operate in UTC so that LocalDate/LocalDateTime
    // calculations stay consistent with the UTC Instants stored in MongoDB and
    // with the timestamps sent to the frontend.
    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(ContinuumApplication.class, args);
    }
}
