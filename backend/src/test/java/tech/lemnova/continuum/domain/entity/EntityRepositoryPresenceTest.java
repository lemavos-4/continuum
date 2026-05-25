package tech.lemnova.continuum.domain.entity;

import org.junit.jupiter.api.Test;

/**
 * EntityRepository was removed in v11.
 * Data is now stored in Backblaze B2 via VaultDataService.
 * This test is kept as documentation of the architectural change.
 */
class EntityRepositoryPresenceTest {

    @Test
    void repositoryRemovedInV11_dataMovedToB2Vault() {
        // EntityRepository no longer exists as a MongoRepository.
        // All data previously in MongoDB is now in the user's B2 vault
        // and accessed via VaultDataService.
        // This test documents the architectural decision.
    }
}
