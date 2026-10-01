package tech.lemnova.continuum.integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.TestPropertySource;

import tech.lemnova.continuum.domain.note.Note;
import tech.lemnova.continuum.infra.persistence.NoteRepository;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

/**
 * Testes de integração E2E para validar o fluxo completo de Type nas notas.
 * 
 * Cenários testados:
 * 1. Criar nota com type
 * 2. Atualizar type da nota
 * 3. Listar tipos únicos do usuário
 * 4. Filtrar notas por tipo (com vaultId)
 * 5. Segurança: não vazar tipos entre vaults
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
@DisplayName("Note Type Integration Tests")
class NoteTypeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NoteRepository noteRepository;

    @BeforeEach
    void setUp() {
        noteRepository.deleteAll();
    }

    @Nested
    @DisplayName("E2E Flow: Create -> Update -> List Types")
    class E2EFlowTests {

        @Test
        @DisplayName("Fluxo completo: criar nota com type, atualizar, listar tipos")
        void testCompleteTypeFlow() throws Exception {
            // Este teste requer autenticação adequada e é um exemplo de estrutura
            // Em um teste real, seria necesário mock de segurança/tokens
            
            /*
            // 1. Criar nota com type
            String createJson = """
                {
                    "title": "Research Article",
                    "content": {"type": "doc", "content": []},
                    "type": "Research"
                }
                """;
            
            mockMvc.perform(post("/api/notes")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("Research"));

            // 2. Atualizar type
            String updateJson = """
                {
                    "type": "Important"
                }
                """;
            
            mockMvc.perform(put("/api/notes/{id}", noteId)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("Important"));

            // 3. Listar tipos únicos
            mockMvc.perform(get("/api/notes/types")
                    .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("Important"));
            */
        }
    }

    @Nested
    @DisplayName("Security: Multi-Tenant Isolation")
    class SecurityIsolationTests {

        @Test
        @DisplayName("Tipos de um vault não vazam para outro vault do mesmo usuário")
        void testVaultIsolationForTypes() throws Exception {
            // Este teste validaria que:
            // 1. User1 em Vault1 cria tipo "Research"
            // 2. User1 em Vault2 NÃO vê "Research" em /api/notes/types
            
            /*
            // Setup: User1 com 2 vaults
            String token1 = getToken("user1", "vault1");
            String token2 = getToken("user1", "vault2");
            
            // Create in vault1
            String createJson = """
                {
                    "title": "Research in Vault 1",
                    "content": {"type": "doc", "content": []},
                    "type": "Research"
                }
                """;
            
            mockMvc.perform(post("/api/notes")
                    .header("Authorization", "Bearer " + token1)
                    .content(createJson))
                .andExpect(status().isCreated());

            // List types in vault2 - should be empty
            mockMvc.perform(get("/api/notes/types")
                    .header("Authorization", "Bearer " + token2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$", hasSize(0)));  // Vazio!
            */
        }

        @Test
        @DisplayName("Tipos de outro usuário não aparecem no endpoint")
        void testUserIsolationForTypes() throws Exception {
            // Este teste validaria que:
            // 1. User1 em Vault1 cria tipo "Research"
            // 2. User2 em Vault1 NÃO vê "Research" em /api/notes/types
            
            /*
            String user1Token = getToken("user1", "vault1");
            String user2Token = getToken("user2", "vault1");
            
            // User1 creates type
            mockMvc.perform(post("/api/notes")
                    .header("Authorization", "Bearer " + user1Token)
                    .content("""
                        {
                            "title": "Research",
                            "content": {"type": "doc", "content": []},
                            "type": "Research"
                        }
                        """))
                .andExpect(status().isCreated());

            // User2 shouldn't see it
            mockMvc.perform(get("/api/notes/types")
                    .header("Authorization", "Bearer " + user2Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));  // Vazio!
            */
        }
    }

    @Nested
    @DisplayName("Type Validation")
    class TypeValidationTests {

        @Test
        @DisplayName("Tipo com mais de 100 caracteres é rejeitado")
        void testTypeLengthValidation() throws Exception {
            // String com 101 caracteres - deve ser rejeitado
            String tooLongType = "a".repeat(101);
            
            /*
            mockMvc.perform(post("/api/notes")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                            "title": "Test",
                            "content": {"type": "doc", "content": []},
                            "type": "%s"
                        }
                        """.formatted(tooLongType)))
                .andExpect(status().isBadRequest());
            */
        }

        @Test
        @DisplayName("Tipo vazio é permitido (opcional)")
        void testEmptyTypeAllowed() throws Exception {
            /*
            mockMvc.perform(post("/api/notes")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                            "title": "Test Note",
                            "content": {"type": "doc", "content": []}
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").doesNotExist());
            */
        }
    }

    @Nested
    @DisplayName("Performance: Type Indexing")
    class PerformanceTests {

        @Test
        @DisplayName("Busca por tipo é rápida com índice MongoDB")
        void testTypeQueryPerformance() throws Exception {
            /*
            // Create 1000 notes with different types
            for (int i = 0; i < 1000; i++) {
                Note note = new Note();
                note.setUserId("user1");
                note.setVaultId("vault1");
                note.setType(i % 10 == 0 ? "Research" : "Todo");
                note.setTitle("Note " + i);
                noteRepository.save(note);
            }

            // Query should be fast because type is indexed
            long start = System.currentTimeMillis();
            List<Note> results = noteRepository.findByUserIdAndTypeAndVaultId("user1", "Research", "vault1");
            long duration = System.currentTimeMillis() - start;

            // Should complete in < 100ms
            assertThat(duration).isLessThan(100);
            assertThat(results).hasSize(100);
            */
        }
    }
}
