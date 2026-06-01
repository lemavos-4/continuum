package tech.lemnova.continuum.infra.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Thin wrapper around the public Google Generative Language API (Gemini).
 * Direct REST call — no SDK, no proxy. Reads GEMINI_API_KEY from the env.
 *
 * Returns null on any failure so callers can fall back to heuristics.
 */
@Slf4j
@Service
public class GeminiService {

    private static final String MODEL = "gemini-2.0-flash";
    private static final String ENDPOINT =
            "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent";

    private static final int MAX_CONTENT_CHARS = 8000;

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final String apiKey;

    public GeminiService(@Value("${gemini.api.key:${GEMINI_API_KEY:}}") String apiKey) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        if (this.apiKey.isEmpty()) {
            log.warn("GEMINI_API_KEY is not configured — Markdown import will rely on heuristics only.");
        }
    }

    public boolean isAvailable() { return !apiKey.isEmpty(); }

    public record EntitySuggestion(String name, String type, String confidence) {}
    public record Analysis(String title, List<EntitySuggestion> entities) {}

    public Analysis analyze(String filename, String currentTitle, String plainText) {
        if (!isAvailable()) return null;
        if (plainText == null) plainText = "";
        String content = plainText.length() > MAX_CONTENT_CHARS
                ? plainText.substring(0, MAX_CONTENT_CHARS) + "\n…[truncated]"
                : plainText;

        String prompt = """
                You analyze a single Markdown note from a personal knowledge vault.
                Return strict JSON with:
                  - "title": a clean, concise human title (max 80 chars). Strip leading "#", dates,
                    file extensions and boilerplate. If the current title is already good, keep it.
                  - "entities": only RELEVANT proper-noun entities clearly named in the note.
                    Each item: { "name": string, "type": one of PERSON|PROJECT|TOPIC|ORGANIZATION,
                                  "confidence": HIGH|MEDIUM }

                Strict rules — be CONSERVATIVE, quality over quantity:
                  - Skip generic concepts: "supermercado", "transporte", "comida", "trabalho",
                    "casa", "reunião", days of week, months, weather, generic verbs.
                  - Skip pronouns, common nouns, sentence starters.
                  - Skip anything that is not a clearly named person/project/org/topic.
                  - Prefer fewer, high-quality entities. If unsure, omit.
                  - PERSON only for actual people (first/last name).
                  - PROJECT only for explicitly named projects/products.
                  - ORGANIZATION only for named companies/institutions.
                  - TOPIC for named domains/areas of interest (e.g. "Stoicism", "Tiptap").

                Filename: %s
                Current title guess: %s
                Content:
                ---
                %s
                ---
                """.formatted(filename == null ? "" : filename,
                              currentTitle == null ? "" : currentTitle,
                              content);

        ObjectNode body = mapper.createObjectNode();
        ArrayNode contents = body.putArray("contents");
        ObjectNode userTurn = contents.addObject();
        userTurn.put("role", "user");
        ArrayNode parts = userTurn.putArray("parts");
        parts.addObject().put("text", prompt);

        ObjectNode genCfg = body.putObject("generationConfig");
        genCfg.put("temperature", 0.2);
        genCfg.put("responseMimeType", "application/json");
        ObjectNode schema = genCfg.putObject("responseSchema");
        schema.put("type", "OBJECT");
        ObjectNode props = schema.putObject("properties");
        props.putObject("title").put("type", "STRING");
        ObjectNode entitiesProp = props.putObject("entities");
        entitiesProp.put("type", "ARRAY");
        ObjectNode items = entitiesProp.putObject("items");
        items.put("type", "OBJECT");
        ObjectNode itemProps = items.putObject("properties");
        itemProps.putObject("name").put("type", "STRING");
        ObjectNode typeProp = itemProps.putObject("type");
        typeProp.put("type", "STRING");
        ArrayNode typeEnum = typeProp.putArray("enum");
        typeEnum.add("PERSON"); typeEnum.add("PROJECT"); typeEnum.add("TOPIC"); typeEnum.add("ORGANIZATION");
        ObjectNode confProp = itemProps.putObject("confidence");
        confProp.put("type", "STRING");
        ArrayNode confEnum = confProp.putArray("enum");
        confEnum.add("HIGH"); confEnum.add("MEDIUM");
        items.putArray("required").add("name").add("type").add("confidence");
        schema.putArray("required").add("title").add("entities");

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(ENDPOINT + "?key=" + apiKey))
                    .timeout(Duration.ofSeconds(25))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() / 100 != 2) {
                log.warn("Gemini API non-2xx ({}): {}", resp.statusCode(),
                        resp.body() == null ? "" : resp.body().substring(0, Math.min(300, resp.body().length())));
                return null;
            }
            JsonNode root = mapper.readTree(resp.body());
            JsonNode textNode = root.path("candidates").path(0)
                    .path("content").path("parts").path(0).path("text");
            if (textNode.isMissingNode() || textNode.isNull()) return null;
            JsonNode parsed = mapper.readTree(textNode.asText());
            String title = parsed.path("title").asText(null);
            List<EntitySuggestion> ents = new ArrayList<>();
            JsonNode arr = parsed.path("entities");
            if (arr.isArray()) {
                for (JsonNode e : arr) {
                    String name = e.path("name").asText("").trim();
                    String type = e.path("type").asText("TOPIC").trim().toUpperCase();
                    String conf = e.path("confidence").asText("MEDIUM").trim().toUpperCase();
                    if (name.isBlank() || name.length() > 80) continue;
                    ents.add(new EntitySuggestion(name, type, conf));
                }
            }
            return new Analysis(title, ents);
        } catch (Exception ex) {
            log.warn("Gemini analyze failed for {}: {}", filename, ex.getMessage());
            return null;
        }
    }
}