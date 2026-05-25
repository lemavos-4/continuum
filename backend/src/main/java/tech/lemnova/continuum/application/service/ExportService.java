package tech.lemnova.continuum.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.controller.dto.export.ExportDataDTO;
import tech.lemnova.continuum.domain.entity.Entity;
import tech.lemnova.continuum.domain.note.Note;
import tech.lemnova.continuum.infra.persistence.EntityRepository;
import tech.lemnova.continuum.infra.persistence.NoteRepository;

import java.util.List;

@Service
public class ExportService {

    private final NoteRepository noteRepo;
    private final EntityRepository entityRepo;
    private final ObjectMapper objectMapper;

    public ExportService(NoteRepository noteRepo, EntityRepository entityRepo, ObjectMapper objectMapper) {
        this.noteRepo = noteRepo;
        this.entityRepo = entityRepo;
        this.objectMapper = objectMapper;
    }

    public ExportDataDTO exportUserData(String userId) {
        // Buscar todas as notas e entidades do usuário
        List<Note> notes = noteRepo.findByUserId(userId);
        List<Entity> entities = entityRepo.findByUserId(userId);

        // Criar o DTO de exportação
        return ExportDataDTO.from(userId, notes, entities);
    }

    public String exportUserDataAsJson(String userId) throws Exception {
        ExportDataDTO data = exportUserData(userId);
        return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(data);
    }
}
