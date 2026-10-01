package tech.lemnova.continuum.controller.dto.note;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

/**
 * Request para criar uma nova nota.
 * 
 * Campo 'content' suporta:
 * - JsonNode (estrutura Tiptap do editor): { type: "doc", content: [...] }
 * - String simples: será convertida para JSON interno
 */
public record NoteCreateRequest(
    @Size(max = 255, message = "Título não pode exceder 255 caracteres") 
    String title,
    
    @NotBlank(message = "Conteúdo é obrigatório")
    JsonNode content,
    
    String folderId,
    
    @Size(max = 100, message = "Tipo não pode exceder 100 caracteres")
    String type
) {
    /**
     * Valida o JsonNode de conteúdo.
     * Deve ser um objeto válido e não-nulo.
     */
    public NoteCreateRequest {
        if (content == null || content.isNull()) {
            throw new IllegalArgumentException("Conteúdo não pode ser nulo");
        }
    }
}

