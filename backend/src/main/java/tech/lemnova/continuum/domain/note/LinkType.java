package tech.lemnova.continuum.domain.note;

/**
 * Tipos de links que podem existir entre notas no grafo de conhecimento.
 * Permite análise semântica das conexões.
 */
public enum LinkType {
    /**
     * Nota A referencia/cita a Nota B
     */
    REFERENCES,
    
    /**
     * Nota A contradiz/questiona a Nota B
     */
    CONTRADICTS,
    
    /**
     * Nota A estende/elabora sobre a Nota B
     */
    EXTENDS,
    
    /**
     * Nota A está relacionada à Nota B (genérico)
     */
    RELATED,
    
    /**
     * Nota A refuta a Nota B
     */
    REFUTES
}
