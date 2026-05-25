package tech.lemnova.continuum.controller.dto.graph;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import tech.lemnova.continuum.domain.note.LinkType;

/**
 * Representa um link/aresta no grafo de conhecimento.
 * 
 * Pode representar:
 * - Nota A menciona Entidade B (type="mention")
 * - Nota A referencia Nota B (type="reference", linkType específico)
 * - Entidade A conecta com Entidade B via nota (type="entity")
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LinkDTO(
    @JsonProperty("source")
    String source,
    
    @JsonProperty("target")
    String target,
    
    @JsonProperty("linkType")
    LinkType linkType,
    
    @JsonProperty("context")
    String context,
    
    @JsonProperty("sourceType")
    String sourceType,
    
    @JsonProperty("targetType")
    String targetType
) {
    /**
     * Construtor simples para compatibilidade (sem linkType/context)
     */
    public LinkDTO(String source, String target) {
        this(source, target, null, null, null, null);
    }
    
    /**
     * Construtor com tipos
     */
    public LinkDTO(String source, String target, String sourceType, String targetType) {
        this(source, target, null, null, sourceType, targetType);
    }
}
