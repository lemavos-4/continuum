import { Building2, Flame, FolderOpen, Tag, User } from "@/lib/heroicons";

const ICONS: Record<string, typeof Tag> = {
  PERSON: User,
  PROJECT: FolderOpen,
  ORGANIZATION: Building2,
  ACTIVITY: Flame,
  TOPIC: Tag,
};

/** Leading icon for an entity type, used in list rows. */
export function EntityTypeIcon({ type, className }: { type?: string; className?: string }) {
  const Icon = ICONS[type ?? ""] ?? Tag;
  return <Icon className={className} />;
}
