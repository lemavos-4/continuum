import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "@/lib/heroicons";
import { entitiesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePlanGate } from "@/hooks/usePlanGate";
import type { Entity } from "@/types";

const TYPE_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "PROJECT", label: "Project", hint: "Track time and progress" },
  { value: "ACTIVITY", label: "Activity", hint: "Daily habit or recurring task" },
  { value: "TOPIC", label: "Topic", hint: "Knowledge area or subject" },
  { value: "PERSON", label: "Person", hint: "Someone in your network" },
  { value: "ORGANIZATION", label: "Organization", hint: "Company or group" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType?: string;
  lockType?: boolean;
  onCreated?: (entity: Entity) => void;
}

export function CreateEntityDialog({ open, onOpenChange, defaultType = "TOPIC", lockType = false, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(defaultType);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { canCreateEntity, applyUsageDelta, refresh } = usePlanGate();

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setTitle("");
      setDescription("");
    }
  }, [open, defaultType]);

  const selected = TYPE_OPTIONS.find((t) => t.value === type) ?? TYPE_OPTIONS[0];

  const handleSubmit = async () => {
    if (!title.trim()) return;
    if (!canCreateEntity) {
      toast({ title: "Plan limit reached", description: "Upgrade to create more entities.", variant: "destructive" });
      onOpenChange(false);
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await entitiesApi.create(title.trim(), type, description.trim() || undefined);
      applyUsageDelta({ entitiesCount: 1, activitiesCount: type === "ACTIVITY" ? 1 : 0 });
      void refresh();
      toast({ title: `${selected.label} created`, description: data?.title });
      onCreated?.(data as Entity);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Could not create",
        description: err?.response?.data?.message || err?.message || "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col">
            <DialogTitle>New {selected.label}</DialogTitle>
            <DialogDescription>{selected.hint}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Title</Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Name your ${selected.label.toLowerCase()}`}
              className="h-11 bg-white/[0.03] border-white/[0.06] focus-visible:ring-white/20"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && title.trim()) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </div>

          {!lockType && (
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.06]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-[11px] text-muted-foreground">{opt.hint}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short note"
              className="h-11 bg-white/[0.03] border-white/[0.06] focus-visible:ring-white/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create {selected.label}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}