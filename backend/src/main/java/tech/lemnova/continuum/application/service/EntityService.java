package tech.lemnova.continuum.application.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.application.exception.NotFoundException;
import tech.lemnova.continuum.application.exception.PlanLimitException;
import tech.lemnova.continuum.application.exception.BadRequestException;
import tech.lemnova.continuum.controller.dto.entity.EntityContextResponse;
import tech.lemnova.continuum.controller.dto.entity.EntityCreateRequest;
import tech.lemnova.continuum.controller.dto.entity.EntityResponse;
import tech.lemnova.continuum.controller.dto.entity.EntityUpdateRequest;
import tech.lemnova.continuum.domain.entity.Entity;
import tech.lemnova.continuum.domain.entity.EntityLink;
import tech.lemnova.continuum.domain.entity.EntityType;
import tech.lemnova.continuum.domain.note.Note;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.plan.PlanType;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.persistence.EntityRepository;
import tech.lemnova.continuum.infra.persistence.EntityLinkRepository;
import tech.lemnova.continuum.infra.persistence.NoteRepository;
import tech.lemnova.continuum.infra.security.CustomUserDetails;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
public class EntityService {

    private final EntityRepository entityRepo;
    private final NoteRepository noteRepo;
    private final EntityLinkRepository entityLinkRepo;
    private final UserRepository userRepo;
    private final UserService userService;
    private final PlanConfiguration planConfig;

    public EntityService(EntityRepository entityRepo, NoteRepository noteRepo, EntityLinkRepository entityLinkRepo, UserRepository userRepo, UserService userService, PlanConfiguration planConfig) {
        this.entityRepo = entityRepo;
        this.noteRepo = noteRepo;
        this.entityLinkRepo = entityLinkRepo;
        this.userRepo = userRepo;
        this.userService = userService;
        this.planConfig = planConfig;
    }
    
    private User getUser(String userId) {
        return userRepo.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    private String getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getUserId();
        }
        throw new IllegalStateException("Authenticated user not found");
    }

    private String getCurrentVaultId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getVaultId();
        }
        throw new IllegalStateException("Authenticated user not found");
    }

    private LocalDate getDefaultStartDate(User user) {
        if (user.getPlan() == PlanType.FREE) {
            return LocalDate.now().minusMonths(3);
        }
        return null; // No limit for VISION
    }
    
    /**
     * Utilitário centralizado para validação de posse de recursos (DEFESA: Horizontal Privilege Escalation)
     * Valida que o recurso (Entity) pertence ao usuário logado em múltiplos níveis:
     * 1. userId: identifica diretamente o proprietário
     * 2. vaultId: assegura que o vault pertence ao usuário
     * 
     * @param userId ID do usuário autenticado
     * @param vaultId ID do vault do usuário
     * @param resourceId ID do recurso (Entity) a validar
     * @return Entity validada
     * @throws NotFoundException se o recurso não existir
     * @throws AccessDeniedException se o usuário não for o proprietário
     */
    private Entity validateOwnership(String userId, String vaultId, String resourceId) {
        return entityRepo.findById(resourceId)
                .filter(entity -> {
                    boolean userIdMatches = entity.getUserId() != null && entity.getUserId().equals(userId);
                    boolean vaultIdMatches = entity.getVaultId() != null && entity.getVaultId().equals(vaultId);
                    
                    if (!userIdMatches || !vaultIdMatches) {
                        throw new AccessDeniedException(
                            "Acesso negado. Você não tem permissão para acessar este recurso. " +
                            "userId match: " + userIdMatches + ", vaultId match: " + vaultIdMatches
                        );
                    }
                    return true;
                })
                .orElseThrow(() -> new NotFoundException("Entity not found: " + resourceId));
    }
    
    public Entity get(String userId, String entityId) {
        User user = getUser(userId);
        return validateOwnership(userId, user.getVaultId(), entityId);
    }
    
    public List<Entity> listByType(String userId, EntityType type) {
        User user = getUser(userId);
        return entityRepo.findByVaultIdAndTypeAndArchivedAtIsNull(user.getVaultId(), type);
    }

    public Entity create(EntityCreateRequest req) {
        String userId = getCurrentUserId();
        String vaultId = getCurrentVaultId();

        // Verificar limite de entidades baseado no plano do usuário
        User user = getUser(userId);
        if (!planConfig.canCreateEntity(user.getPlan(), user.getEntityCount())) {
            throw new PlanLimitException("Limite de entidades atingido para seu plano. Atualize para uma assinatura superior.");
        }
        
        Entity entity = Entity.builder()
                .userId(userId)
                .vaultId(vaultId)
                .title(req.title().trim())
                .description(req.description())
                .type(req.type() != null ? req.type() : EntityType.PERSON)
                .fileKey(null) // TODO: set fileKey when uploading to B2
                .createdAt(Instant.now())
                .build();
        Entity saved = entityRepo.save(entity);
        user.incrementEntityCount();
        userRepo.save(user);
        return saved;
    }

    @Deprecated
    public Entity create(String userId, String vaultId, EntityCreateRequest req) {
        return create(req);
    }

    /**
     * Otimizado: Busca entidade com validação de posse de forma eficiente
     * @param userId ID do usuário autenticado
     * @param vaultId ID do vault do usuário
     * @param entityId ID da entidade a recuperar
     * @return Entity validada e segura
     */
    public Entity getEntity(String userId, String vaultId, String entityId) {
        return validateOwnership(userId, vaultId, entityId);
    }
    
    /**
     * @deprecated Use getEntity(userId, vaultId, entityId) para validações mais robustas
     */
    @Deprecated
    public Entity getEntity(String vaultId, String entityId) {
        return entityRepo.findById(entityId)
                .filter(e -> e.getVaultId() != null && e.getVaultId().equals(vaultId))
                .orElseThrow(() -> new NotFoundException("Entity not found: " + entityId));
    }

    public List<Note> getNotesForEntity(String userId, String vaultId, String entityId) {
        User user = getUser(userId);
        // Validação de posse: garante que a entidade pertence ao usuário
        validateOwnership(userId, vaultId, entityId);
        
        // Busca notas que contenham o ID desta entidade na lista de conexões
        return noteRepo.findByUserId(userId).stream()
                .filter(n -> n.getEntityIds() != null && n.getEntityIds().contains(entityId))
                .collect(Collectors.toList());
    }

    public List<Entity> getConnections(String userId, String vaultId, String entityId) {
        User user = getUser(userId);
        // Validação de posse: garante que a entidade pertence ao usuário
        validateOwnership(userId, vaultId, entityId);
        
        // Direct links
        List<String> directIds = entityLinkRepo.findByUserIdAndFromEntityId(userId, entityId)
                .stream().map(EntityLink::getToEntityId).collect(Collectors.toList());
        directIds.addAll(entityLinkRepo.findByUserIdAndToEntityId(userId, entityId)
                .stream().map(EntityLink::getFromEntityId).collect(Collectors.toList()));

        // Note-based links
        List<String> noteIdsWithThisEntity = noteRepo.findByUserId(userId).stream()
                .filter(n -> n.getEntityIds() != null && n.getEntityIds().contains(entityId))
                .map(Note::getId)
                .collect(Collectors.toList());

        List<String> connectedEntityIds = noteRepo.findByUserId(userId).stream()
                .filter(n -> noteIdsWithThisEntity.contains(n.getId()))
                .flatMap(n -> n.getEntityIds().stream())
                .filter(id -> !id.equals(entityId))
                .distinct()
                .collect(Collectors.toList());

        // Combine and deduplicate
        List<String> allIds = Stream.concat(directIds.stream(), connectedEntityIds.stream()).distinct().collect(Collectors.toList());
        return entityRepo.findByIdInAndArchivedAtIsNull(allIds);
    }

    public Entity update(String userId, String vaultId, String entityId, EntityUpdateRequest req) {
        User user = getUser(userId);
        // Validação centralizada de posse
        Entity entity = validateOwnership(userId, vaultId, entityId);
        
        if (req.title() != null && !req.title().isBlank()) entity.setTitle(req.title().trim());
        if (req.description() != null) entity.setDescription(req.description());
        if (req.type() != null) entity.setType(req.type());
        return entityRepo.save(entity);
    }

    public void delete(String entityId) {
        String userId = getCurrentUserId();
        String vaultId = getCurrentVaultId();

        User user = getUser(userId);
        // Validação centralizada de posse
        Entity entity = validateOwnership(userId, vaultId, entityId);
        entityRepo.delete(entity);
        userService.decrementEntityCount(userId);
    }

    @Deprecated
    public void delete(String userId, String vaultId, String entityId) {
        delete(entityId);
    }

    public List<Entity> listByVault(String vaultId) {
        return entityRepo.findByVaultIdAndArchivedAtIsNull(vaultId);
    }
    
    public List<Entity> listByUser(String userId) {
        return entityRepo.findByUserIdAndArchivedAtIsNull(userId);
    }

    public Page<Entity> listByUser(String userId, Pageable pageable) {
        return entityRepo.findByUserIdAndArchivedAtIsNull(userId, pageable);
    }

    public Page<Entity> listByUser(String userId, Pageable pageable, LocalDate startDate, LocalDate endDate) {
        User user = getUser(userId);
        LocalDate effectiveStart = startDate != null ? startDate : getDefaultStartDate(user);
        LocalDate effectiveEnd = endDate != null ? endDate : LocalDate.now();
        // Note: EntityRepository needs a method to filter by createdAt between start and end
        // For now, assume we filter in memory or add to repo
        Page<Entity> all = entityRepo.findByUserId(userId, pageable);
        List<Entity> filtered = all.getContent().stream()
                .filter(e -> {
                    LocalDate created = e.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                    return (effectiveStart == null || !created.isBefore(effectiveStart)) &&
                           !created.isAfter(effectiveEnd);
                })
                .collect(Collectors.toList());
        return new org.springframework.data.domain.PageImpl<>(filtered, pageable, all.getTotalElements());
    }
    
    /**
     * Carrega apenas os dados necessários para construir o grafo de conhecimento.
     * Otimizado para trazer apenas id e title, economizando memória e banda de rede.
     * 
     * @param userId ID do usuário
     * @return Lista de entidades com apenas os campos essenciais para o grafo
     */
    public List<Entity> listByUserForGraph(String userId) {
        return entityRepo.findGraphDataByUserId(userId);
    }
    
    public EntityContextResponse getEntityContext(String userId, String entityId) {
        User user = getUser(userId);
        
        // Validação centralizada de posse
        Entity entity = validateOwnership(userId, user.getVaultId(), entityId);

        List<Note> connectedNotes = noteRepo.findByUserId(userId).stream()
            .filter(note -> note.getEntityIds() != null && note.getEntityIds().contains(entityId))
            .collect(Collectors.toList());

        List<EntityContextResponse.NoteSummary> summaries = connectedNotes.stream()
            .map(note -> new EntityContextResponse.NoteSummary(note.getId(), note.getTitle()))
            .collect(Collectors.toList());

        return EntityContextResponse.from(entity, summaries);
    }

    public Entity trackActivity(String userId, String entityId) {
        User user = getUser(userId);
        
        // Validação centralizada de posse
        Entity entity = validateOwnership(userId, user.getVaultId(), entityId);
        
        // Validar se é do tipo ACTIVITY
        if (entity.getType() != EntityType.ACTIVITY) {
            throw new BadRequestException("Entidade não é uma atividade. Tipo: " + entity.getType());
        }
        
        // Adicionar a data atual se ainda não existir (evita duplicata)
        java.time.LocalDate today = java.time.LocalDate.now();
        if (entity.getTrackingDates() == null) {
            entity.setTrackingDates(new java.util.ArrayList<>());
        }
        if (!entity.getTrackingDates().contains(today)) {
            entity.getTrackingDates().add(today);
        }
        
        return entityRepo.save(entity);
    }
}