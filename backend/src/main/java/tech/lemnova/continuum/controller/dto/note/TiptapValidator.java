package tech.lemnova.continuum.controller.dto.note;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Validadores e helpers para TiptapParser
 */
public class TiptapValidator {
    
    /**
     * Valida se um JsonNode segue a estrutura de um documento Tiptap.
     * 
     * Verificações:
     * - type === "doc"
     * - content é um array
     * - cada elemento do content tem um tipo válido
     */
    public static boolean isValidTiptapDocument(JsonNode node) {
        if (node == null || !node.isObject()) {
            return false;
        }
        
        JsonNode typeNode = node.get("type");
        JsonNode contentNode = node.get("content");
        
        if (typeNode == null || !typeNode.asText().equals("doc")) {
            return false;
        }
        
        if (contentNode == null || !contentNode.isArray()) {
            return false;
        }
        
        // Validar cada elemento do conteúdo
        for (JsonNode element : contentNode) {
            if (!isValidTiptapNode(element)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Valida se um JsonNode é um elemento Tiptap válido
     */
    private static boolean isValidTiptapNode(JsonNode node) {
        if (node == null || !node.isObject()) {
            return false;
        }
        
        JsonNode typeNode = node.get("type");
        if (typeNode == null) {
            return false;
        }
        
        String nodeType = typeNode.asText();
        
        // Verificar tipos conhecidos
        return isKnownNodeType(nodeType);
    }
    
    /**
     * Tipos de nó conhecidos no Tiptap
     */
    private static boolean isKnownNodeType(String type) {
        return switch (type) {
            case "text", "paragraph", "heading", "blockquote", "code", "codeBlock",
                 "bulletList", "orderedList", "listItem", "image", "mention", 
                 "link", "hardBreak", "horizontalRule" -> true;
            default -> false;
        };
    }
    
    /**
     * Calcula o tamanho do documento Tiptap em bytes
     */
    public static long calculateDocumentSize(JsonNode doc) {
        if (doc == null) {
            return 0;
        }
        
        return doc.toString().getBytes().length;
    }
    
    /**
     * Verifica se o documento está dentro do limite de tamanho
     * Limite recomendado: 5MB
     */
    public static boolean isWithinSizeLimit(JsonNode doc, long maxSizeBytes) {
        return calculateDocumentSize(doc) <= maxSizeBytes;
    }
}
