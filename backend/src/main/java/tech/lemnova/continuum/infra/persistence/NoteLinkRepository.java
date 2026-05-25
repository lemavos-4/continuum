package tech.lemnova.continuum.infra.persistence;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import tech.lemnova.continuum.domain.note.NoteLink;
import java.util.List;

/**
 * Repository para gerenciar links bidirecionais entre notas (backlinks).
 * 
 * Queries otimizadas para os índices:
 * - Backlinks: { targetNoteId, userId, vaultId }
 * - Forward Links: { sourceNoteId, userId, vaultId }
 */
@Repository
public interface NoteLinkRepository extends MongoRepository<NoteLink, String> {
    
    /**
     * Busca todas as notas que mencionam (referem) uma nota específica.
     * Útil para exibir "Backlinks" no frontend.
     * 
     * @param targetNoteId ID da nota que está sendo referenciada
     * @param userId ID do usuário (para validação de segurança)
     * @param vaultId ID do vault (para validação de segurança)
     * @return Lista de NoteLink que apontam para a nota especificada
     */
    List<NoteLink> findByTargetNoteIdAndUserIdAndVaultId(String targetNoteId, String userId, String vaultId);
    
    /**
     * Busca todas as notas que esta nota referencia.
     * 
     * @param sourceNoteId ID da nota que faz as referências
     * @param userId ID do usuário (para validação de segurança)
     * @param vaultId ID do vault (para validação de segurança)
     * @return Lista de NoteLink que partem desta nota
     */
    List<NoteLink> findBySourceNoteIdAndUserIdAndVaultId(String sourceNoteId, String userId, String vaultId);
    
    /**
     * Remove todos os links que envolvem uma nota (tanto como source quanto como target).
     * Usado quando uma nota é deletada.
     * 
     * @param noteId ID da nota
     * @param userId ID do usuário
     * @param vaultId ID do vault
     */
    void deleteBySourceNoteIdAndUserIdAndVaultId(String noteId, String userId, String vaultId);
    void deleteByTargetNoteIdAndUserIdAndVaultId(String noteId, String userId, String vaultId);
    
    /**
     * Busca um link específico entre duas notas.
     * 
     * @param sourceNoteId ID da nota source
     * @param targetNoteId ID da nota target
     * @return NoteLink entre as duas notas, ou null se não existir
     */
    NoteLink findBySourceNoteIdAndTargetNoteId(String sourceNoteId, String targetNoteId);
    
    /**
     * Conta quantos backlinks uma nota possui.
     * 
     * @param targetNoteId ID da nota
     * @param userId ID do usuário
     * @param vaultId ID do vault
     * @return Quantidade de backlinks
     */
    long countByTargetNoteIdAndUserIdAndVaultId(String targetNoteId, String userId, String vaultId);
    
    /**
     * Busca todos os links de um usuário em um vault.
     * Útil para construir o grafo de conhecimento completo.
     * 
     * NOTA: Para grandes datasets (>10k links), considerar adicionar paginação.
     * 
     * @param userId ID do usuário
     * @param vaultId ID do vault
     * @return Lista de todos os NoteLink do usuário
     */
    List<NoteLink> findByUserIdAndVaultId(String userId, String vaultId);
}

