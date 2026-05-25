import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from "@/lib/heroicons";
import type { Entity, EntityType } from '@/types';
import { useEntityStore } from '@/contexts/EntityContext';

const ENTITY_TYPE_CONFIG: Record<EntityType, { label: string; icon: string; hoverBg: string; hoverBorder: string }> = {
  ACTIVITY: { label: 'Activity', icon: '🟢', hoverBg: 'rgba(16,185,129,0.08)', hoverBorder: 'rgba(16,185,129,0.3)' },
  PROJECT: { label: 'Project', icon: '🔵', hoverBg: 'rgba(59,130,246,0.08)', hoverBorder: 'rgba(59,130,246,0.3)' },
  PERSON: { label: 'Person', icon: '🟡', hoverBg: 'rgba(245,158,11,0.08)', hoverBorder: 'rgba(245,158,11,0.3)' },
  TOPIC: { label: 'Topic', icon: '🟣', hoverBg: 'rgba(139,92,246,0.08)', hoverBorder: 'rgba(139,92,246,0.3)' },
  ORGANIZATION: { label: 'Organization', icon: '🟠', hoverBg: 'rgba(249,115,22,0.08)', hoverBorder: 'rgba(249,115,22,0.3)' },
  ACCURRENCY: { label: 'Accurrency', icon: '🌸', hoverBg: 'rgba(236,72,153,0.08)', hoverBorder: 'rgba(236,72,153,0.3)' },
};

const BADGE_COLORS: Record<EntityType, string> = {
  ACTIVITY: '#10b981',
  PROJECT: '#3b82f6',
  PERSON: '#f59e0b',
  TOPIC: '#8b5cf6',
  ORGANIZATION: '#f97316',
  ACCURRENCY: '#ec4899',
};

interface EntityMentionSelectorProps {
  isOpen: boolean;
  query: string;
  entities: Entity[];
  onEntitySelect: (entity: Entity) => void;
  onQueryChange: (query: string) => void;
  isLoading?: boolean;
}

export const EntityMentionSelector = memo(function EntityMentionSelector({
  isOpen,
  query,
  entities,
  onEntitySelect,
  onQueryChange,
  isLoading = false,
}: EntityMentionSelectorProps) {
  const { setActiveMention, addEntityToNote } = useEntityStore();
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredEntities = useMemo(() => {
    if (!query) return entities.slice(0, 8);
    return entities
      .filter((entity) =>
        entity.title.toLowerCase().includes(query.toLowerCase()) ||
        entity.description?.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 8);
  }, [entities, query]);

  // Reset index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [filteredEntities.length, query]);

  const handleSelect = useCallback((entity: Entity) => {
    setActiveMention({ id: entity.id, title: entity.title, type: entity.type });
    addEntityToNote(entity);
    onEntitySelect(entity);
  }, [setActiveMention, addEntityToNote, onEntitySelect]);

  // Keyboard navigation handler — called from parent via onKeyDown
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || filteredEntities.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredEntities.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredEntities.length) % filteredEntities.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(filteredEntities[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onQueryChange('');
    }
  }, [isOpen, filteredEntities, activeIndex, handleSelect, onQueryChange]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.12 }}
        className="w-full rounded-lg border border-border/80 bg-popover shadow-lg backdrop-blur-md"
        onKeyDown={handleKeyDown}
      >
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            placeholder="Search for entity..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            autoFocus
          />
        </div>

        {/* List */}
        <ScrollArea className="max-h-[260px]">
          <div className="p-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEntities.length > 0 ? (
              filteredEntities.map((entity, index) => {
                const config = ENTITY_TYPE_CONFIG[entity.type];
                const badgeColor = BADGE_COLORS[entity.type] || '#888';
                const isActive = index === activeIndex;
                return (
                  <button
                    key={entity.id}
                    onClick={() => handleSelect(entity)}
                    className="w-full flex items-start gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isActive ? config.hoverBg : 'transparent',
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className="text-base leading-none mt-0.5 shrink-0">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{entity.title}</div>
                      {entity.description && (
                        <div className="text-xs text-muted-foreground truncate">{entity.description}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs" style={{ color: badgeColor, borderColor: `${badgeColor}33` }}>
                      {config.label}
                    </Badge>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-1">
                <Search className="w-4 h-4 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">No entities found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {filteredEntities.length === 0
              ? 'Type to search'
              : `${filteredEntities.length} encontrada${filteredEntities.length !== 1 ? 's' : ''}`}
          </span>
          <span className="hidden sm:inline">↑↓ navigate · Enter select · Esc close</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

// Export the keyboard handler type for parent usage
export type EntityMentionSelectorHandle = {
  handleKeyDown: (e: React.KeyboardEvent) => void;
};
