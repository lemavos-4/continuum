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
import { useLanguage } from "@/contexts/LanguageContext";
import type { Entity } from "@/types";

function getTypeOptions(t: (key: string, vars?: Record<string, unknown>) => string): { value: string; label: string; hint: string }[] {
  return [
    { value: "PROJECT", label: t("ent_type_project"), hint: t("ent_hint_project") },
    { value: "ACTIVITY", label: t("ent_type_activity"), hint: t("ent_hint_activity") },
    { value: "TOPIC", label: t("ent_type_topic"), hint: t("ent_hint_topic") },
    { value: "PERSON", label: t("ent_type_person"), hint: t("ent_hint_person") },
    { value: "ORGANIZATION", label: t("ent_type_organization"), hint: t("ent_hint_organization") },
  ];
}

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
  const { t } = useLanguage();
  const { canCreateEntity, applyUsageDelta, refresh } = usePlanGate();
  const TYPE_OPTIONS = getTypeOptions(t);

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
      toast({ title: t("ent_plan_limit_reached"), description: t("ent_upgrade_to_create"), variant: "destructive" });
      onOpenChange(false);
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await entitiesApi.create(title.trim(), type, description.trim() || undefined);
      applyUsageDelta({ entitiesCount: 1, activitiesCount: type === "ACTIVITY" ? 1 : 0 });
      void refresh();
      toast({ title: t("ent_created_toast", { type: selected.label }), description: data?.title });
      onCreated?.(data as Entity);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: t("ent_could_not_create"),
        description: err?.response?.data?.message || err?.message || t("ent_try_again"),
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
            <DialogTitle>{t("ent_new_type", { type: selected.label })}</DialogTitle>
            <DialogDescription>{selected.hint}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("ent_title")}</Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("ent_name_your", { type: selected.label.toLowerCase() })}
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
              <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("ent_type")}</Label>
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
            <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("ent_description_optional")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("ent_a_short_note")}
              className="h-11 bg-white/[0.03] border-white/[0.06] focus-visible:ring-white/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("ent_cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("ent_create_type", { type: selected.label })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}