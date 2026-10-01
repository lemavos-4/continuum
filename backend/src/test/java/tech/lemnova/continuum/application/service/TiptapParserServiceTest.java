package tech.lemnova.continuum.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TiptapParserServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final TiptapParserService parserService = new TiptapParserService();

    @Test
    void extractNoteReferences_shouldFindNoteMentionNode() throws Exception {
        String json = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"See \"},{\"type\":\"noteMention\",\"attrs\":{\"id\":\"note-123\",\"label\":\"Linked Note\"}}]}]}";
        JsonNode content = objectMapper.readTree(json);

        List<TiptapParserService.NoteReference> references = parserService.extractNoteReferences(content);
        assertThat(references).hasSize(1);
        assertThat(references.get(0).noteId).isEqualTo("note-123");
        assertThat(references.get(0).label).isEqualTo("Linked Note");

        List<TiptapParserService.Mention> mentions = parserService.extractMentions(content);
        assertThat(mentions).isEmpty();
    }

    @Test
    void extractNoteReferences_shouldFindOldNoteMentionAttrs() throws Exception {
        String json = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"See \"},{\"type\":\"mention\",\"attrs\":{\"id\":\"note-456\",\"label\":\"Old Note\",\"type\":\"NOTE\"}}]}]}";
        JsonNode content = objectMapper.readTree(json);

        List<TiptapParserService.NoteReference> references = parserService.extractNoteReferences(content);
        assertThat(references).hasSize(1);
        assertThat(references.get(0).noteId).isEqualTo("note-456");
        assertThat(references.get(0).label).isEqualTo("Old Note");

        List<TiptapParserService.Mention> mentions = parserService.extractMentions(content);
        assertThat(mentions).isEmpty();
    }
}
