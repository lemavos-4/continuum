package tech.lemnova.continuum.controller.dto.note;

import tech.lemnova.continuum.domain.note.LinkType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request para criar um link entre duas notas.
 * 
 * @param sourceNoteId ID da nota que faz a referência
 * @param targetNoteId ID da nota que é referenciada
 * @param linkType Tipo semântico do link
 * @param context Trecho de contexto (até 200 caracteres) onde o link aparece
 */
public record CreateNoteLinkRequest(
    @NotBlank(message = "sourceNoteId é obrigatório")
    String sourceNoteId,
    
    @NotBlank(message = "targetNoteId é obrigatório")
    String targetNoteId,
    
    @NotNull(message = "linkType é obrigatório")
    LinkType linkType,
    
    String context
) {}
