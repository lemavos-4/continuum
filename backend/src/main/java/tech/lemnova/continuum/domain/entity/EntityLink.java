package tech.lemnova.continuum.domain.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "entity_links")
public class EntityLink {

    @Id
    private String id;

    @NotBlank
    @Indexed
    private String userId;

    @NotBlank
    @Indexed
    private String fromEntityId;

    @NotBlank
    @Indexed
    private String toEntityId;

    private String relationshipType;  // e.g., "related", "parent"
}