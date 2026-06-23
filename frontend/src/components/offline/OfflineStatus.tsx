import { useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertCircle } from "@/lib/heroicons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import { flushQueue } from "@/lib/offline/sync";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OfflineStatusProps {
  className?: string;
  compact?: boolean;
}

export function OfflineStatus({ className, compact = false }: OfflineStatusProps) {
  const { status, pending, syncing } = useOfflineStatus();
  const [forcing, setForcing] = useState(false);

  const effectiveStatus = syncing ? "syncing" : status;

  const handleSyncNow = async () => {
    if (!navigator.onLine) {
      toast.error("You're offline. Changes will sync automatically when back online.");
      return;
    }
    setForcing(true);
    try {
      const result = await flushQueue();
      if (result.sent === 0 && result.failed === 0) {
        toast.success("Everything is up to date.");
      } else if (result.failed === 0) {
        toast.success(`${result.sent} change${result.sent === 1 ? "" : "s"} synced.`);
      } else {
        toast.warning(`${result.sent} synced, ${result.failed} failed — will retry.`);
      }
    } catch {
      toast.error("Sync failed.");
    } finally {
      setForcing(false);
    }
  };

  const label =
    effectiveStatus === "offline"
      ? pending > 0
        ? `Offline · ${pending} pending`
        : "Offline"
      : effectiveStatus === "syncing"
        ? "Syncing…"
        : effectiveStatus === "error"
          ? `Sync issue${pending > 0 ? ` · ${pending} pending` : ""}`
          : pending > 0
            ? `${pending} pending`
            : "Online";

  const Icon =
    effectiveStatus === "offline"
      ? CloudOff
      : effectiveStatus === "error"
        ? AlertCircle
        : effectiveStatus === "syncing"
          ? RefreshCw
          : Cloud;

  // Hide pill when fully online with nothing pending and no error (compact mode).
  if (compact && effectiveStatus === "online" && pending === 0) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSyncNow}
          disabled={forcing || syncing}
          className={cn(
            "h-7 gap-1.5 rounded-full px-2.5 text-xs font-normal",
            effectiveStatus === "offline" && "text-amber-500",
            effectiveStatus === "error" && "text-destructive",
            effectiveStatus === "syncing" && "text-muted-foreground",
            className
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", (syncing || forcing) && "animate-spin")} />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="text-xs">
          {effectiveStatus === "offline"
            ? "Working offline. Changes save locally and sync when you're back online."
            : "Click to sync now."}
          {pending > 0 && (
            <div className="mt-1 text-muted-foreground">{pending} pending change{pending === 1 ? "" : "s"}</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default OfflineStatus;
