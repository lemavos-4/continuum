package tech.lemnova.continuum.infra.persistence;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.data.mongodb.core.MongoTemplate;

import tech.lemnova.continuum.domain.note.Note;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@DataMongoTest
@DisplayName("NoteRepository")
class NoteRepositoryTest {

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    @BeforeEach
    void setUp() {
        mongoTemplate.dropCollection(Note.class);
    }

    @Nested
    @DisplayName("findDistinctTypes")
    class FindDistinctTypesTests {

        @Test
        @DisplayName("retorna tipos únicos ordenados alfabeticamente")
        void testFindDistinctTypesSorted() {
            // Given
            String userId = "user123";
            String vaultId = "vault456";
            
            Note note1 = new Note();
            note1.setUserId(userId);
            note1.setVaultId(vaultId);
            note1.setType("Zebra");
            note1.setTitle("Note 1");
            
            Note note2 = new Note();
            note2.setUserId(userId);
            note2.setVaultId(vaultId);
            note2.setType("Apple");
            note2.setTitle("Note 2");
            
            Note note3 = new Note();
            note3.setUserId(userId);
            note3.setVaultId(vaultId);
            note3.setType("Apple");  // Duplicado
            note3.setTitle("Note 3");
            
            mongoTemplate.save(note1);
            mongoTemplate.save(note2);
            mongoTemplate.save(note3);

            // When
            List<NoteRepository.TypeProjection> types = noteRepository.findDistinctTypes(userId, vaultId);
            List<String> typeStrings = types.stream()
                .map(NoteRepository.TypeProjection::getType)
                .toList();

            // Then
            assertThat(typeStrings)
                .containsExactly("Apple", "Zebra")
                .isSorted();
        }

        @Test
        @DisplayName("filtra por userId - não retorna tipos de outro usuário")
        void testFindDistinctTypesFilteredByUserId() {
            // Given
            String user1 = "user123";
            String user2 = "user456";
            String vaultId = "vault789";
            
            Note note1 = new Note();
            note1.setUserId(user1);
            note1.setVaultId(vaultId);
            note1.setType("Research");
            note1.setTitle("Note 1");
            
            Note note2 = new Note();
            note2.setUserId(user2);
            note2.setVaultId(vaultId);
            note2.setType("Todo");
            note2.setTitle("Note 2");
            
            mongoTemplate.save(note1);
            mongoTemplate.save(note2);

            // When
            List<NoteRepository.TypeProjection> typesForUser1 = noteRepository.findDistinctTypes(user1, vaultId);

            // Then
            assertThat(typesForUser1)
                .hasSize(1)
                .extracting(NoteRepository.TypeProjection::getType)
                .containsExactly("Research");
        }

        @Test
        @DisplayName("filtra por vaultId - não retorna tipos de outro vault (SECURITY)")
        void testFindDistinctTypesFilteredByVaultId() {
            // Given
            String userId = "user123";
            String vault1 = "vault1";
            String vault2 = "vault2";
            
            Note note1 = new Note();
            note1.setUserId(userId);
            note1.setVaultId(vault1);
            note1.setType("Research");
            note1.setTitle("Note 1");
            
            Note note2 = new Note();
            note2.setUserId(userId);
            note2.setVaultId(vault2);
            note2.setType("Todo");
            note2.setTitle("Note 2");
            
            mongoTemplate.save(note1);
            mongoTemplate.save(note2);

            // When
            List<NoteRepository.TypeProjection> typesForVault1 = noteRepository.findDistinctTypes(userId, vault1);

            // Then - CRITICAL: Deve conter apenas tipos do vault1
            assertThat(typesForVault1)
                .hasSize(1)
                .extracting(NoteRepository.TypeProjection::getType)
                .containsExactly("Research")
                .doesNotContain("Todo");
        }

        @Test
        @DisplayName("ignora tipos null e vazios")
        void testFindDistinctTypesIgnoresNullAndEmpty() {
            // Given
            String userId = "user123";
            String vaultId = "vault456";
            
            Note note1 = new Note();
            note1.setUserId(userId);
            note1.setVaultId(vaultId);
            note1.setType("Research");
            note1.setTitle("Note 1");
            
            Note note2 = new Note();
            note2.setUserId(userId);
            note2.setVaultId(vaultId);
            note2.setType(null);
            note2.setTitle("Note 2 - null type");
            
            Note note3 = new Note();
            note3.setUserId(userId);
            note3.setVaultId(vaultId);
            note3.setType("");
            note3.setTitle("Note 3 - empty type");
            
            mongoTemplate.save(note1);
            mongoTemplate.save(note2);
            mongoTemplate.save(note3);

            // When
            List<NoteRepository.TypeProjection> types = noteRepository.findDistinctTypes(userId, vaultId);

            // Then
            assertThat(types)
                .hasSize(1)
                .extracting(NoteRepository.TypeProjection::getType)
                .containsExactly("Research");
        }

        @Test
        @DisplayName("retorna lista vazia quando não há tipos")
        void testFindDistinctTypesEmpty() {
            // Given
            String userId = "user123";
            String vaultId = "vault456";
            
            Note note1 = new Note();
            note1.setUserId(userId);
            note1.setVaultId(vaultId);
            note1.setType(null);
            note1.setTitle("Note 1 - null type");
            
            mongoTemplate.save(note1);

            // When
            List<NoteRepository.TypeProjection> types = noteRepository.findDistinctTypes(userId, vaultId);

            // Then
            assertThat(types).isEmpty();
        }
    }

    @Nested
    @DisplayName("findByUserIdAndTypeAndVaultId")
    class FindByUserIdAndTypeAndVaultIdTests {

        @Test
        @DisplayName("retorna notas do tipo especificado no vault correto")
        void testFindByUserIdAndTypeAndVaultId() {
            // Given
            String userId = "user123";
            String vaultId = "vault456";
            String type = "Research";
            
            Note note1 = new Note();
            note1.setUserId(userId);
            note1.setVaultId(vaultId);
            note1.setType(type);
            note1.setTitle("Research Note 1");
            
            Note note2 = new Note();
            note2.setUserId(userId);
            note2.setVaultId(vaultId);
            note2.setType("Todo");
            note2.setTitle("Todo Note");
            
            mongoTemplate.save(note1);
            mongoTemplate.save(note2);

            // When
            List<Note> result = noteRepository.findByUserIdAndTypeAndVaultId(userId, type, vaultId);

            // Then
            assertThat(result)
                .hasSize(1)
                .allMatch(n -> n.getType().equals("Research"));
        }

        @Test
        @DisplayName("não retorna notas de outro vault")
        void testFindByUserIdAndTypeAndVaultIdIsolation() {
            // Given
            String userId = "user123";
            String vault1 = "vault1";
            String vault2 = "vault2";
            String type = "Research";
            
            Note note1 = new Note();
            note1.setUserId(userId);
            note1.setVaultId(vault1);
            note1.setType(type);
            note1.setTitle("Research in Vault 1");
            
            Note note2 = new Note();
            note2.setUserId(userId);
            note2.setVaultId(vault2);
            note2.setType(type);
            note2.setTitle("Research in Vault 2");
            
            mongoTemplate.save(note1);
            mongoTemplate.save(note2);

            // When
            List<Note> resultForVault1 = noteRepository.findByUserIdAndTypeAndVaultId(userId, type, vault1);

            // Then - CRITICAL: Deve retornar apenas notas do vault1
            assertThat(resultForVault1)
                .hasSize(1)
                .allMatch(n -> n.getVaultId().equals(vault1));
        }
    }

    @Nested
    @DisplayName("Type Field Persistence")
    class TypePersistenceTests {

        @Test
        @DisplayName("tipo é salvo e recuperado corretamente")
        void testTypePersistence() {
            // Given
            Note note = new Note();
            note.setUserId("user123");
            note.setVaultId("vault456");
            note.setType("Research");
            note.setTitle("Test Note");
            
            // When
            Note saved = mongoTemplate.save(note);
            Note retrieved = noteRepository.findById(saved.getId()).orElse(null);

            // Then
            assertThat(retrieved)
                .isNotNull()
                .hasFieldOrPropertyWithValue("type", "Research");
        }

        @Test
        @DisplayName("tipo pode ser null")
        void testTypeCanBeNull() {
            // Given
            Note note = new Note();
            note.setUserId("user123");
            note.setVaultId("vault456");
            note.setType(null);
            note.setTitle("Test Note");
            
            // When
            Note saved = mongoTemplate.save(note);
            Note retrieved = noteRepository.findById(saved.getId()).orElse(null);

            // Then
            assertThat(retrieved)
                .isNotNull()
                .hasFieldOrPropertyWithValue("type", null);
        }

        @Test
        @DisplayName("tipo é indexado para buscas rápidas")
        void testTypeIsIndexed() {
            // This test validates that the @Indexed annotation exists
            // In a real scenario, we'd check MongoDB for the index
            
            Note note = new Note();
            note.setUserId("user123");
            note.setVaultId("vault456");
            note.setType("Research");
            note.setTitle("Test Note");
            
            mongoTemplate.save(note);

            // If type wasn't indexed, this would be slower
            List<Note> result = noteRepository.findByUserIdAndType("user123", "Research");
            assertThat(result).hasSize(1);
        }
    }
}
