import { ReactNode, createContext, useContext, useState, useCallback } from 'react';
import type { Entity, Note } from '@/types';

export interface MentionedEntity {
  id: string;
  title: string;
  type: string;
  cursorPosition?: number;
}

export type InspectableNote = Note & { type: 'NOTE'; description?: string; noteType?: string };
export type InspectableEntity = Entity | InspectableNote;

export interface EntityContextState {
  // Global mention state
  activeMention: MentionedEntity | null;
  hoveredMentionId: string | null;
  
  // Session entities
  entitiesInNote: Entity[];
  
  // Inspector state
  inspectorOpen: boolean;
  inspectorEntity: InspectableEntity | null;
  
  // Loading states
  loadingEntityId: string | null;
  
  // Actions
  setActiveMention: (mention: MentionedEntity | null) => void;
  setHoveredMentionId: (id: string | null) => void;
  setEntitiesInNote: (entities: Entity[]) => void;
  addEntityToNote: (entity: Entity) => void;
  addEntity: (entity: Entity) => void;
  removeEntityFromNote: (entityId: string) => void;
  fetchEntities: () => Promise<void>;
  updateGraph: () => void;
  
  // Inspector actions
  openInspector: (entity: InspectableEntity) => void;
  closeInspector: () => void;
  setLoadingEntityId: (id: string | null) => void;
}

const EntityContext = createContext<EntityContextState | undefined>(undefined);

export function EntityProvider({ children }: { children: ReactNode }) {
  const [activeMention, setActiveMention] = useState<MentionedEntity | null>(null);
  const [hoveredMentionId, setHoveredMentionId] = useState<string | null>(null);
  const [entitiesInNote, setEntitiesInNote] = useState<Entity[]>([]);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorEntity, setInspectorEntity] = useState<InspectableEntity | null>(null);
  const [loadingEntityId, setLoadingEntityId] = useState<string | null>(null);

  const addEntityToNote = useCallback((entity: Entity) => {
    setEntitiesInNote((prev) => {
      const exists = prev.some((e) => e.id === entity.id);
      return exists ? prev : [...prev, entity];
    });
  }, []);

  const removeEntityFromNote = useCallback((entityId: string) => {
    setEntitiesInNote((prev) => prev.filter((e) => e.id !== entityId));
  }, []);

  const openInspector = useCallback((entity: InspectableEntity) => {
    setInspectorEntity(entity);
    setInspectorOpen(true);
    setActiveMention({
      id: entity.id,
      title: entity.title,
      type: entity.type,
    });
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
    setInspectorEntity(null);
    setActiveMention(null);
  }, []);

  const addEntity = useCallback((entity: Entity) => {
    addEntityToNote(entity);
  }, [addEntityToNote]);

  const fetchEntities = useCallback(async () => {
    // Placeholder for future entity collection refresh.
    return;
  }, []);

  const updateGraph = useCallback(() => {
    // Placeholder for future graph update logic.
  }, []);

  const value: EntityContextState = {
    activeMention,
    setActiveMention,
    hoveredMentionId,
    setHoveredMentionId,
    entitiesInNote,
    setEntitiesInNote,
    inspectorOpen,
    inspectorEntity,
    openInspector,
    closeInspector,
    loadingEntityId,
    setLoadingEntityId,
    addEntityToNote,
    addEntity,
    removeEntityFromNote,
    fetchEntities,
    updateGraph,
  };

  return (
    <EntityContext.Provider value={value}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntityContext() {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntityContext must be used within EntityProvider');
  }
  return context;
}

// Alias for compatibility with Zustand interface
export const useEntityStore = useEntityContext;
