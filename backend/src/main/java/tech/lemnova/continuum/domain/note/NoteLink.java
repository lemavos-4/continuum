package tech.lemnova.continuum.domain.note;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

/**
 * NoteLink representa um link bidirecional entre duas notas no grafo de conhecimento.
 * 
 * Estrutura:
 * - sourceNoteId -> targetNoteId (para achar notas que esta nota referencia)
 * - targetNoteId -> sourceNoteId (para achar backlinks - quem referencia esta nota)
 * 
 * Índices:
 * - { targetNoteId, userId, vaultId }: busca rápida de backlinks
 * - { sourceNoteId, userId, vaultId }: busca rápida de links forward
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "note_links")
@CompoundIndex(name = "backlinks_idx", def = "{'targetNoteId': 1, 'userId': 1, 'vaultId': 1}")
@CompoundIndex(name = "forward_links_idx", def = "{'sourceNoteId': 1, 'userId': 1, 'vaultId': 1}")
public class NoteLink {
    
    @Id
    private String id;
    
    /**
     * Nota que faz a referência (ORIGEM do link)
     */
    @NotBlank(message = "sourceNoteId é obrigatório")
    @Indexed
    private String sourceNoteId;
    
    /**
     * Nota que é referenciada (DESTINO do link)
     */
    @NotBlank(message = "targetNoteId é obrigatório")
    @Indexed
    private String targetNoteId;
    
    /**
     * Proprietário do link (mesmo do usuário que criou a nota)
     */
    @NotBlank(message = "userId é obrigatório")
    @Indexed
    private String userId;
    
    /**
     * Vault ao qual o link pertence
     */
    @NotBlank(message = "vaultId é obrigatório")
    @Indexed
    private String vaultId;
    
    /**
     * Tipo semântico do link
     */
    private LinkType linkType;
    
    /**
     * Contexto do link: trecho de até 200 caracteres onde o link foi encontrado.
     * Útil para exibir no frontend onde exatamente uma nota referencia outra.
     * 
     * Exemplo: "Como mencionado por Einstein, a teoria da relatividade..."
     */
    private String context;
    
    /**
     * Timestamp de criação do link
     */
    private Instant createdAt;
}
