package tech.lemnova.continuum.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Parser para extrair dados estruturados do JSON do Tiptap Editor.
 * 
 * O Tiptap gera uma árvore JSON com a seguinte estrutura:
 * {
 *   "type": "doc",
 *   "content": [
 *     { "type": "paragraph", "content": [...] },
 *     { "type": "mention", "attrs": { "id": "entity-123", "label": "John Doe" } },
 *     ...
 *   ]
 * }
 * 
 * Este serviço percorre essa árvore e extrai:
 * - Menções de entidades (@mention)
 * - Links entre notas
 * - Estrutura de blocos para renderização
 */
@Slf4j
@Service
public class TiptapParserService {
    
    /**
     * DTO para representar uma menção encontrada no conteúdo
     */
    public static class Mention {
        public String entityId;
        public String label;
        public String nodeType;
        
        public Mention(String entityId, String label, String nodeType) {
            this.entityId = entityId;
            this.label = label;
            this.nodeType = nodeType;
        }
    }
    
    /**
     * DTO para represental um link entre notas
     */
    public static class NoteReference {
        public String noteId;
        public String label;
        
        public NoteReference(String noteId, String label) {
            this.noteId = noteId;
            this.label = label;
        }
    }
    
    /**
     * Extrai todas as menções de entidades de um conteúdo Tiptap.
     * 
     * Procura por nós do tipo "mention" na árvore e extrai:
     * - entityId dos atributos
     * - label para displayar
     * - tipo do nó
     * 
     * @param content JsonNode contendo o documento Tiptap
     * @return Lista de Mention encontradas
     */
    public List<Mention> extractMentions(JsonNode content) {
        Set<Mention> mentions = new HashSet<>();
        if (content == null || content.isNull()) {
            return new ArrayList<>();
        }
        
        traverseAndExtractMentions(content, mentions);
        return new ArrayList<>(mentions);
    }
    
    /**
     * Extrai todas as referências a notas de um conteúdo Tiptap.
     * 
     * Procura por links (`type: "link"` com href contendo `note://`) 
     * ou nós especiais de referência a notas.
     * 
     * @param content JsonNode contendo o documento Tiptap
     * @return Lista de NoteReference encontradas
     */
    public List<NoteReference> extractNoteReferences(JsonNode content) {
        List<NoteReference> references = new ArrayList<>();
        if (content == null || content.isNull()) {
            return references;
        }
        
        traverseAndExtractNoteReferences(content, references);
        return references;
    }
    
    /**
     * Converte JsonNode do Tiptap para texto plano para armazenamento.
     * 
     * Percorre a árvore e concatena todos os textos encontrados,
     * útil para busca full-text e geração de preview.
     * 
     * @param content JsonNode contendo o documento Tiptap
     * @return String com todo o texto concatenado
     */
    public String extractPlainText(JsonNode content) {
        StringBuilder textBuilder = new StringBuilder();
        if (content == null || content.isNull()) {
            return "";
        }
        
        traverseAndExtractText(content, textBuilder);
        return textBuilder.toString().trim();
    }
    
    /**
     * Valida se o JsonNode é um documento Tiptap válido.
     * 
     * Um documento válido deve ter:
     * - type: "doc"
     * - content: array de nós
     * 
     * @param content JsonNode a validar
     * @return true se é um documento Tiptap válido
     */
    public boolean isValidTiptapDocument(JsonNode content) {
        if (content == null || !content.isObject()) {
            return false;
        }
        
        JsonNode typeNode = content.get("type");
        JsonNode contentNode = content.get("content");
        
        return typeNode != null && typeNode.asText().equals("doc")
                && contentNode != null && contentNode.isArray();
    }
    
    // ============================================================================
    // MÉTODOS PRIVADOS DE TRAVERSAL
    // ============================================================================
    
    /**
     * Percorre recursivamente o JSON do Tiptap e extrai menções.
     */
    private void traverseAndExtractMentions(JsonNode node, Set<Mention> mentions) {
        if (node == null || node.isNull()) {
            return;
        }
        
        // Se este nó é uma menção de entidade, extrai seu conteúdo
        if (node.isObject()) {
            JsonNode typeNode = node.get("type");
            if (typeNode != null && "mention".equals(typeNode.asText()) && !isNoteMentionNode(node)) {
                Mention mention = extractMentionFromNode(node);
                if (mention != null) {
                    mentions.add(mention);
                }
            }
            
            // Percorrer recursivamente cada campo do objeto
            node.fields().forEachRemaining(entry -> {
                traverseAndExtractMentions(entry.getValue(), mentions);
            });
        }
        // Se é um array, iterar cada elemento
        else if (node.isArray()) {
            for (JsonNode arrayElement : node) {
                traverseAndExtractMentions(arrayElement, mentions);
            }
        }
    }
    
    /**
     * Percorre recursivamente o JSON e extrai referências a notas.
     */
    private void traverseAndExtractNoteReferences(JsonNode node, List<NoteReference> references) {
        if (node == null || node.isNull()) {
            return;
        }
        
        if (node.isObject()) {
            JsonNode typeNode = node.get("type");
            if (typeNode != null) {
                if ("link".equals(typeNode.asText())) {
                    JsonNode hrefNode = node.get("attrs");
                    if (hrefNode != null && hrefNode.has("href")) {
                        String href = hrefNode.get("href").asText();
                        if (href.startsWith("note://")) {
                            String noteId = href.replace("note://", "");
                            NoteReference ref = new NoteReference(noteId, extractNodeText(node));
                            references.add(ref);
                        }
                    }
                } else if ("noteMention".equals(typeNode.asText()) || ("mention".equals(typeNode.asText()) && isNoteMentionNode(node))) {
                    JsonNode attrsNode = node.get("attrs");
                    if (attrsNode != null && attrsNode.has("id")) {
                        String noteId = attrsNode.get("id").asText();
                        String label = attrsNode.has("label") ? attrsNode.get("label").asText() : extractNodeText(node);
                        references.add(new NoteReference(noteId, label));
                    }
                }
            }
            
            // Percorrer recursivamente
            node.fields().forEachRemaining(entry -> {
                traverseAndExtractNoteReferences(entry.getValue(), references);
            });
        }
        else if (node.isArray()) {
            for (JsonNode arrayElement : node) {
                traverseAndExtractNoteReferences(arrayElement, references);
            }
        }
    }

    private boolean isNoteMentionNode(JsonNode node) {
        if (node == null || node.isNull() || !node.isObject()) {
            return false;
        }

        JsonNode attrsNode = node.get("attrs");
        if (attrsNode == null || !attrsNode.isObject()) {
            return false;
        }

        JsonNode typeNode = attrsNode.get("type");
        return typeNode != null && "NOTE".equalsIgnoreCase(typeNode.asText());
    }
    
    /**
     * Percorre o JSON e extrai todo o texto em forma de string.
     * Útil para busca full-text.
     */
    private void traverseAndExtractText(JsonNode node, StringBuilder textBuilder) {
        if (node == null || node.isNull()) {
            return;
        }
        
        if (node.isObject()) {
            // Se este nó tem um campo "text", adicione ao resultado
            JsonNode textNode = node.get("text");
            if (textNode != null && textNode.isTextual()) {
                textBuilder.append(textNode.asText()).append(" ");
            }
            
            JsonNode typeNode = node.get("type");
            if (typeNode != null) {
                if ("mention".equals(typeNode.asText())) {
                    JsonNode attrsNode = node.get("attrs");
                    if (attrsNode != null && attrsNode.has("label")) {
                        if (attrsNode.has("type") && "NOTE".equalsIgnoreCase(attrsNode.get("type").asText())) {
                            textBuilder.append(attrsNode.get("label").asText()).append(" ");
                        } else {
                            textBuilder.append("@").append(attrsNode.get("label").asText()).append(" ");
                        }
                    }
                } else if ("noteMention".equals(typeNode.asText())) {
                    JsonNode attrsNode = node.get("attrs");
                    if (attrsNode != null && attrsNode.has("label")) {
                        textBuilder.append(attrsNode.get("label").asText()).append(" ");
                    }
                }
            }
            
            // Percorrer recursivamente cada campo
            node.fields().forEachRemaining(entry -> {
                traverseAndExtractText(entry.getValue(), textBuilder);
            });
        }
        else if (node.isArray()) {
            for (JsonNode arrayElement : node) {
                traverseAndExtractText(arrayElement, textBuilder);
            }
        }
    }
    
    // ============================================================================
    // MÉTODOS PRIVADOS DE EXTRAÇÃO
    // ============================================================================
    
    /**
     * Extrai uma Mention de um nó do tipo "mention".
     * 
     * Nó esperado:
     * { "type": "mention", "attrs": { "id": "entity-123", "label": "John Doe" } }
     */
    private Mention extractMentionFromNode(JsonNode mentionNode) {
        try {
            JsonNode attrsNode = mentionNode.get("attrs");
            if (attrsNode == null || !attrsNode.isObject()) {
                log.warn("Mention node sem attrs: {}", mentionNode);
                return null;
            }
            
            String entityId = attrsNode.get("id") != null 
                    ? attrsNode.get("id").asText() 
                    : null;
            
            String label = attrsNode.get("label") != null 
                    ? attrsNode.get("label").asText() 
                    : "Unknown";
            
            if (entityId == null || entityId.isEmpty()) {
                log.warn("Mention sem entityId: {}", mentionNode);
                return null;
            }
            
            return new Mention(entityId, label, "mention");
        } catch (Exception e) {
            log.error("Erro ao extrair mention: {}", e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Extrai o texto de um nó (usado para labels de referências).
     */
    private String extractNodeText(JsonNode node) {
        if (node == null) return "";
        
        StringBuilder text = new StringBuilder();
        if (node.isObject()) {
            JsonNode textNode = node.get("text");
            if (textNode != null && textNode.isTextual()) {
                text.append(textNode.asText());
            }
        }
        return text.toString();
    }
}
