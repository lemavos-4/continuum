package tech.lemnova.continuum.controller.dto.note;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Helpers e constructores para criar estruturas Tiptap do lado do backend.
 * Útil para gerar conteúdo padrão ou migração de dados.
 */
public class TiptapBuilder {
    
    /**
     * Cria um documento Tiptap vazio
     */
    public static ObjectNode createEmptyDocument() {
        ObjectNode doc = JsonNodeFactory.instance.objectNode();
        doc.put("type", "doc");
        doc.set("content", JsonNodeFactory.instance.arrayNode());
        return doc;
    }
    
    /**
     * Cria um parágrafo Tiptap com texto
     * 
     * @param text Texto para o parágrafo
     * @return Objeto paragraph Tiptap
     */
    public static ObjectNode createParagraph(String text) {
        ObjectNode paragraph = JsonNodeFactory.instance.objectNode();
        paragraph.put("type", "paragraph");
        
        ObjectNode textNode = JsonNodeFactory.instance.objectNode();
        textNode.put("type", "text");
        textNode.put("text", text);
        
        paragraph.set("content", JsonNodeFactory.instance.arrayNode().add(textNode));
        return paragraph;
    }
    
    /**
     * Cria um nó de menção Tiptap
     * 
     * @param entityId ID da entidade mencionada
     * @param label Label/nome da entidade
     * @return Objeto mention Tiptap
     */
    public static ObjectNode createMentionNode(String entityId, String label) {
        ObjectNode mention = JsonNodeFactory.instance.objectNode();
        mention.put("type", "mention");
        
        ObjectNode attrs = JsonNodeFactory.instance.objectNode();
        attrs.put("id", entityId);
        attrs.put("label", label);
        
        mention.set("attrs", attrs);
        return mention;
    }
    
    /**
     * Cria um heading Tiptap
     * 
     * @param level Nível do heading (1-6)
     * @param text Texto do heading
     * @return Objeto heading Tiptap
     */
    public static ObjectNode createHeading(int level, String text) {
        ObjectNode heading = JsonNodeFactory.instance.objectNode();
        heading.put("type", "heading");
        
        ObjectNode attrs = JsonNodeFactory.instance.objectNode();
        attrs.put("level", Math.min(6, Math.max(1, level)));
        heading.set("attrs", attrs);
        
        ObjectNode textNode = JsonNodeFactory.instance.objectNode();
        textNode.put("type", "text");
        textNode.put("text", text);
        
        heading.set("content", JsonNodeFactory.instance.arrayNode().add(textNode));
        return heading;
    }
    
    /**
     * Cria um link Tiptap
     * 
     * @param href URL ou note://noteId
     * @param text Texto do link
     * @return Objeto link Tiptap
     */
    public static ObjectNode createLink(String href, String text) {
        ObjectNode link = JsonNodeFactory.instance.objectNode();
        link.put("type", "link");
        
        ObjectNode attrs = JsonNodeFactory.instance.objectNode();
        attrs.put("href", href);
        link.set("attrs", attrs);
        
        ObjectNode textNode = JsonNodeFactory.instance.objectNode();
        textNode.put("type", "text");
        textNode.put("text", text);
        
        link.set("content", JsonNodeFactory.instance.arrayNode().add(textNode));
        return link;
    }
    
    /**
     * Exemplo: Cria um documento completo com menções
     * 
     * <p>Resultado:</p>
     * <pre>
     * {
     *   "type": "doc",
     *   "content": [
     *     { "type": "heading", "attrs": { "level": 1 }, "content": [...] },
     *     { "type": "paragraph", "content": [..., "mention", ...] }
     *   ]
     * }
     * </pre>
     */
    public static ObjectNode createExampleDocumentWithMentions() {
        ObjectNode doc = createEmptyDocument();
        
        // Adicionar um heading
        doc.withArray("content").add(createHeading(1, "Meeting Notes"));
        
        // Adicionar um parágrafo com menção
        ObjectNode para = JsonNodeFactory.instance.objectNode();
        para.put("type", "paragraph");
        para.set("content", JsonNodeFactory.instance.arrayNode()
                .add(JsonNodeFactory.instance.objectNode()
                        .put("type", "text")
                        .put("text", "Discussed with "))
                .add(createMentionNode("entity-123", "John Smith"))
                .add(JsonNodeFactory.instance.objectNode()
                        .put("type", "text")
                        .put("text", " about the project timeline."))
        );
        
        doc.withArray("content").add(para);
        
        return doc;
    }
}
