package tech.lemnova.continuum.controller.dto.search;

import java.util.Collections;
import java.util.List;

public record SearchResponseDTO(
    List<SearchResultNoteDTO> notes,
    List<SearchResultEntityDTO> entities
) {
    public SearchResponseDTO {
        // Garantir que as listas nunca sejam null
        if (notes == null) {
            notes = Collections.emptyList();
        }
        if (entities == null) {
            entities = Collections.emptyList();
        }
    }
}
