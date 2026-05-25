package tech.lemnova.continuum.domain.metrics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "user_score_snapshots")
public class UserScoreSnapshot {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    @Builder.Default
    private Map<String, Double> scoresByDate = new HashMap<>();

    @Builder.Default
    private Instant updatedAt = Instant.now();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Map<String, Double> getScoresByDate() {
        return scoresByDate;
    }

    public void setScoresByDate(Map<String, Double> scoresByDate) {
        this.scoresByDate = scoresByDate;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
