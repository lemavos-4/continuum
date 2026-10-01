package tech.lemnova.continuum.controller.dto.note;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Exemplo de estrutura Tiptap JSON que o frontend enviará.
 * 
 * Exemplo de uso no JavaScript/Tiptap:
 * 
 * ```javascript
 * const editor = useEditor({
 *   extensions: [
 *     StarterKit,
 *     Mention.configure({
 *       HTMLAttributes: { class: 'mention' }
 *     })
 *   ],
 *   content: `
 *     <p>Hey <span data-type="mention" data-id="entity-123" data-label="John">@John</span></p>
 *   `
 * });
 * 
 * // Para enviar para o backend:
 * const json = editor.getJSON();
 * // {
 * //   "type": "doc",
 * //   "content": [
 * //     {
 * //       "type": "paragraph",
 * //       "content": [
 * //         { "type": "text", "text": "Hey " },
 * //         {
 * //           "type": "mention",
 * //           "attrs": { "id": "entity-123", "label": "John" }
 * //         }
 * //       ]
 * //     }
 * //   ]
 * // }
 * 
 * // Enviar via POST:
 * fetch('/api/notes', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     title: "My note",
 *     content: json  // JsonNode
 *   })
 * });
 * ```
 */
public class TiptapDocExample {
    
    /**
     * Estrutura de um documento Tiptap válido
     */
    public static final String VALID_TIPTAP_JSON = """
        {
          "type": "doc",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "This is a mention: "
                },
                {
                  "type": "mention",
                  "attrs": {
                    "id": "entity-123",
                    "label": "John Doe"
                  }
                },
                {
                  "type": "text",
                  "text": " and more text."
                }
              ]
            },
            {
              "type": "heading",
              "attrs": { "level": 2 },
              "content": [
                { "type": "text", "text": "A Heading" }
              ]
            },
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Reference to another note: "
                },
                {
                  "type": "link",
                  "attrs": { "href": "note://note-456" },
                  "content": [
                    { "type": "text", "text": "My Other Note" }
                  ]
                }
              ]
            }
          ]
        }
    """;
    
    /**
     * Represeta um nó de menção no Tiptap
     */
    public static class MentionNode {
        @JsonProperty("type")
        public String type = "mention";
        
        @JsonProperty("attrs")
        public MentionAttrs attrs;
        
        public static class MentionAttrs {
            @JsonProperty("id")
            public String id;
            
            @JsonProperty("label")
            public String label;
        }
    }
    
    /**
     * Representa um nó de link no Tiptap
     */
    public static class LinkNode {
        @JsonProperty("type")
        public String type = "link";
        
        @JsonProperty("attrs")
        public LinkAttrs attrs;
        
        @JsonProperty("content")
        public java.util.List<TextNode> content;
        
        public static class LinkAttrs {
            @JsonProperty("href")
            public String href; // Exemplos: "note://note-123", "https://example.com"
        }
    }
    
    /**
     * Representa um nó de texto
     */
    public static class TextNode {
        @JsonProperty("type")
        public String type = "text";
        
        @JsonProperty("text")
        public String text;
    }
}
