package tech.lemnova.continuum.controller.dto.note;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Size;

/**
 * Request para atualizar uma nota.
 * 
 * Campo 'content' suporta:
 * - JsonNode (estrutura Tiptap do editor)
 * - null (se não quiser atualizar o conteúdo)
 * 
 * Campo 'type' é opcional e pode ser atualizado sem alterar conteúdo
 */
public record NoteUpdateRequest(
    @Size(max = 255, message = "Título não pode exceder 255 caracteres") 
    String title,
    
    JsonNode content,
    
    String folderId,
    
    @Size(max = 100, message = "Tipo não pode exceder 100 caracteres")
    String type
) {}

