package tech.lemnova.continuum.infra.persistence;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tech.lemnova.continuum.domain.entity.EntityLink;

import java.util.List;

@Repository
public interface EntityLinkRepository extends MongoRepository<EntityLink, String> {
    List<EntityLink> findByUserIdAndFromEntityId(String userId, String fromEntityId);
    List<EntityLink> findByUserIdAndToEntityId(String userId, String toEntityId);
    void deleteByUserId(String userId);
}