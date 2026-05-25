package tech.lemnova.continuum.domain.folder;

import org.junit.jupiter.api.Test;

/**
 * FolderRepository was removed in v11.
 * Data is now stored in Backblaze B2 via VaultDataService.
 * This test is kept as documentation of the architectural change.
 */
class FolderRepositoryPresenceTest {

    @Test
    void repositoryRemovedInV11_dataMovedToB2Vault() {
        // FolderRepository no longer exists as a MongoRepository.
        // All data previously in MongoDB is now in the user's B2 vault
        // and accessed via VaultDataService.
        // This test documents the architectural decision.
    }
}
