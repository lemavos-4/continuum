package tech.lemnova.continuum.application.service;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.lemnova.continuum.application.exception.NotFoundException;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.persistence.NoteRepository;
import tech.lemnova.continuum.infra.persistence.EntityRepository;
import tech.lemnova.continuum.domain.subscription.SubscriptionRepository;
import tech.lemnova.continuum.domain.token.TokenBlacklistRepository;

@Service
public class UserService {

    private final MongoTemplate mongoTemplate;
    private final UserRepository userRepository;
    private final NoteRepository noteRepository;
    private final EntityRepository entityRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final TokenBlacklistRepository tokenBlacklistRepository;

    public UserService(MongoTemplate mongoTemplate,
                      UserRepository userRepository,
                      NoteRepository noteRepository,
                      EntityRepository entityRepository,
                      SubscriptionRepository subscriptionRepository,
                      TokenBlacklistRepository tokenBlacklistRepository) {
        this.mongoTemplate = mongoTemplate;
        this.userRepository = userRepository;
        this.noteRepository = noteRepository;
        this.entityRepository = entityRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.tokenBlacklistRepository = tokenBlacklistRepository;
    }

    public void incrementNoteCount(String userId) {
        mongoTemplate.updateFirst(
            Query.query(Criteria.where("_id").is(userId)),
            new Update().inc("noteCount", 1),
            User.class
        );
    }

    public void incrementEntityCount(String userId) {
        mongoTemplate.updateFirst(
            Query.query(Criteria.where("_id").is(userId)),
            new Update().inc("entityCount", 1),
            User.class
        );
    }

    public void decrementNoteCount(String userId) {
        mongoTemplate.updateFirst(
            Query.query(Criteria.where("_id").is(userId)),
            new Update().inc("noteCount", -1),
            User.class
        );
    }

    public void decrementEntityCount(String userId) {
        mongoTemplate.updateFirst(
            Query.query(Criteria.where("_id").is(userId)),
            new Update().inc("entityCount", -1),
            User.class
        );
    }

    /**
     * Deletes a user and all associated data (cascade delete).
     * Removes: Notes, Entities, Subscriptions, and Token Blacklist entries.
     * @param userId The ID of the user to delete
     * @throws NotFoundException if user not found
     */
    @Transactional
    public void deleteUserWithCascade(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));

        // 1. Delete all notes for this user
        noteRepository.deleteByUserId(userId);

        // 2. Delete all entities for this user
        entityRepository.deleteByUserId(userId);

        // 3. Delete all subscriptions for this user
        subscriptionRepository.deleteByUserId(userId);

        // 4. Delete all blacklisted tokens for this user
        tokenBlacklistRepository.deleteByUserId(userId);

        // 5. Finally, delete the user
        userRepository.delete(user);
    }

    public User getById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }
}