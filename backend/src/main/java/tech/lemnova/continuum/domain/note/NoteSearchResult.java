package tech.lemnova.continuum.domain.note;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NoteSearchResult {
    private Note note;
    private String preview;
}
