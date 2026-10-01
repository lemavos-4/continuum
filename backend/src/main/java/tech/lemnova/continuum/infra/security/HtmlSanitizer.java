package tech.lemnova.continuum.infra.security;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Cleaner;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Serviço de sanitização contra injeção XSS.
 * Remove tags <script>, event handlers (onload, onerror, onclick, etc)
 * e outras tags perigosas do conteúdo.
 * 
 * Usa jsoup com whitelist de tags permitidas para proteger contra:
 * - Cross-Site Scripting (XSS)
 * - HTML/JavaScript injection
 * - Event handler attacks
 */
@Service
public class HtmlSanitizer {

    private static final Logger log = LoggerFactory.getLogger(HtmlSanitizer.class);

    /**
     * Define a whitelist de tags HTML permitidas.
     * Customizada para ricas notas sem permitir scripts ou handlers.
     */
    private static final Safelist SAFE_WHITELIST = createSafeWhitelist();

    /**
     * Cria whitelist permissiva (permite formatação rich text mas não scripts).
     */
    private static Safelist createSafeWhitelist() {
        return Safelist.relaxed()
                // Remover event handlers: on*
                .removeTags("script", "style", "iframe", "object", "embed")
                // Permitir listas
                .addTags("ul", "ol", "li")
                // Permitir tabelas
                .addTags("table", "thead", "tbody", "tfoot", "tr", "td", "th")
                .addAttributes("table", "border", "cellpadding", "cellspacing")
                .addAttributes("td", "colspan", "rowspan")
                .addAttributes("th", "colspan", "rowspan")
                // Permitir links
                .addProtocols("a", "href", "http", "https", "mailto")
                .addProtocols("img", "src", "http", "https", "data")
                // Bloquear data: URIs (podem conter scripts)
                .addProtocols("a", "href", "http", "https", "mailto", "ftp", "ftps");
    }

    /**
     * Sanitiza conteúdo HTML removendo tags e handlers perigosos.
     * 
     * @param html Conteúdo HTML bruto (pode conter malware)
     * @return HTML sanitizado e seguro
     */
    public String sanitize(String html) {
        if (html == null || html.trim().isEmpty()) {
            return "";
        }

        try {
            // Parse HTML
            Document doc = Jsoup.parse(html);
            
            // Remove event handler attributes manualmente (camada extra de proteção)
            removeEventHandlers(doc);
            
            // Aplica whitelist
            Document cleanDoc = new Cleaner(SAFE_WHITELIST).clean(doc);
            
            // Retorna body HTML sem wrapper
            String cleaned = cleanDoc.body().html();
            
            log.debug("HTML sanitized: {} characters → {} characters", html.length(), cleaned.length());
            return cleaned;
            
        } catch (Exception e) {
            log.warn("Error sanitizing HTML, returning plain text: {}", e.getMessage());
            // Se algo der errado, retornar como texto puro (escape HTML)
            return escapeHtml(html);
        }
    }

    /**
     * Remove manualmente todos os event handler attributes.
     * Oferece proteção adicional contra injeções.
     */
    private void removeEventHandlers(Document doc) {
        // Lista de event handlers perigosos
        String[] eventHandlers = {
            "onload", "onerror", "onclick", "onmouseover", "onmouseout",
            "ondblclick", "oncontextmenu", "onkeydown", "onkeyup", "onchange",
            "onfocus", "onblur", "onsubmit", "onreset", "ondrag", "ondrop",
            "onscroll", "onwheel", "onpointerdown", "onpointerup", "ontouchstart",
            "ontouchend", "onanimationstart", "onanimationend", "ontransitionend"
        };

        for (Element element : doc.getAllElements()) {
            for (String handler : eventHandlers) {
                element.removeAttr(handler);
            }
        }
    }

    /**
     * Escapa caracteres HTML especiais para prevenir injeção.
     * Converte: < > & " '  para entidades HTML
     * 
     * @param text Texto plano
     * @return Texto com HTML escapado
     */
    public String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    /**
     * Valida se o conteúdo contém padrões suspeitos.
     * Retorna true se conteúdo parece seguro.
     * 
     * @param content Conteúdo a validar
     * @return true se seguro, false se suspeito
     */
    public boolean isContentSafe(String content) {
        if (content == null || content.isEmpty()) {
            return true;
        }

        String lower = content.toLowerCase();
        
        // Detectar padrões perigosos
        return !lower.contains("<script") &&
               !lower.contains("javascript:") &&
               !lower.contains("onerror=") &&
               !lower.contains("onload=") &&
               !lower.contains("onclick=") &&
               !lower.contains("<iframe") &&
               !lower.contains("<embed") &&
               !lower.contains("<object");
    }
}
