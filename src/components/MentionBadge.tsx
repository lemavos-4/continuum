import React from 'react';
import { motion } from 'framer-motion';
import { X } from "@/lib/heroicons";
import type { EntityType } from '@/types';

const ENTITY_TYPE_CONFIG: Record<EntityType, { color: string; bgColor: string; textColor: string; borderColor: string }> = {
  ACTIVITY: {
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    textColor: '#059669',
    borderColor: '#10b981',
  },
  PROJECT: {
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    textColor: '#1d4ed8',
    borderColor: '#3b82f6',
  },
  PERSON: {
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    textColor: '#d97706',
    borderColor: '#f59e0b',
  },
  TOPIC: {
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    textColor: '#7c3aed',
    borderColor: '#8b5cf6',
  },
  ORGANIZATION: {
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    textColor: '#ea580c',
    borderColor: '#f97316',
  },
  ACCURRENCY: {
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.1)',
    textColor: '#db2777',
    borderColor: '#ec4899',
  },
};

interface MentionBadgeProps {
  title: string;
  type: EntityType;
  onRemove?: () => void;
  className?: string;
}

export const MentionBadge = React.memo(function MentionBadge({
  title,
  type,
  onRemove,
  className = '',
}: MentionBadgeProps) {
  const config = ENTITY_TYPE_CONFIG[type] || ENTITY_TYPE_CONFIG.TOPIC;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all ${className}`}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        color: config.textColor,
      }}
    >
      <span className="text-sm font-medium truncate">@{title}</span>
      {onRemove && (
        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          onClick={onRemove}
          className="p-0.5 hover:bg-current/10 rounded transition-colors"
        >
          <X className="w-3 h-3" />
        </motion.button>
      )}
    </motion.div>
  );
});

MentionBadge.displayName = 'MentionBadge';
