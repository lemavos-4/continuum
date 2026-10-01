package tech.lemnova.continuum.application.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.domain.entity.Entity;

import java.util.List;
import java.util.regex.Pattern;

@Slf4j
@Service
public class ExtractionService {

    /**
     * Extrai IDs de entidades encontradas no conteúdo da nota.
     * Busca case-insensitive pelos títulos das entidades no conteúdo.
     *
     * @param content conteúdo da nota
     * @param userEntities lista de entidades do usuário
     * @return Set de IDs das entidades encontradas
     */
    public List<String> extractEntityIds(String content, List<Entity> userEntities) {
        if (content == null || content.isBlank() || userEntities == null || userEntities.isEmpty()) {
            return List.of();
        }

        List<String> extractedIds = userEntities.stream()
                .filter(entity -> entity != null && entity.getTitle() != null && !entity.getTitle().isBlank())
                .filter(entity -> {
                    String title = entity.getTitle();
                    String regex = "(?iu)\\b" + Pattern.quote(title) + "\\b";
                    return Pattern.compile(regex).matcher(content).find();
                })
                .map(Entity::getId)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .toList();

        if (!extractedIds.isEmpty()) {
            log.info("Extracted {} entities from note", extractedIds.size());
        }

        return extractedIds;
    }
}