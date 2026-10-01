import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { PhotoIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  isAllowedWallpaperFile,
  loadWallpaperSettings,
  removeWallpaper,
  subscribeWallpaper,
  uploadWallpaper,
  type NoteWallpaperSettings,
} from "@/lib/note-wallpaper";
interface WallpaperSettingsProps {
  value: NoteWallpaperSettings;
  onChange: (value: NoteWallpaperSettings) => void;
}

export default function WallpaperSettings({ value, onChange }: WallpaperSettingsProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [wallpaper, setWallpaper] = useState<NoteWallpaperSettings>(() => loadWallpaperSettings());
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribeWallpaper = subscribeWallpaper(setWallpaper);
    return () => { unsubscribeWallpaper(); };
  }, []);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!isAllowedWallpaperFile(file)) {
      toast({ title: t("ed_unsupported_format"), description: t("ed_unsupported_format_desc"), variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await uploadWallpaper(file);
      toast({ title: t("ed_wallpaper_updated") });
    } catch (e: any) {
      toast({ title: t("ed_upload_failed"), description: e?.message || t("ed_upload_failed_desc"), variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    try {
      await removeWallpaper();
      toast({ title: t("ed_wallpaper_removed") });
    } catch {
      toast({ title: t("ed_wallpaper_remove_failed"), variant: "destructive" });
    }
  };

  const update = (patch: Partial<NoteWallpaperSettings>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="space-y-4 py-5">
      <div className="flex items-start gap-4">
        <PhotoIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground/80">{t("ed_wallpaper")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("ed_wallpaper_note")}</p>
        </div>
        {wallpaper.fileId && (
          <Button
            type="button"
            variant="quiet"
            size="xs"
            onClick={handleRemove}
            className="shrink-0 normal-case hover:text-destructive"
          >
            {t("ed_remove")}
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="ml-8 w-[calc(100%_-_2rem)] gap-2 normal-case sm:w-auto"
      >
        {uploading ? (
          <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> {t("ed_uploading")}</>
        ) : (
          <><PhotoIcon className="h-3.5 w-3.5" /> {wallpaper.fileId ? t("ed_replace_image") : t("ed_upload_image")}</>
        )}
      </Button>

      <div className="ml-8 space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("ed_blur")}</Label>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{value.blur}px</span>
        </div>
        <Slider
          min={0}
          max={40}
          step={1}
          value={[value.blur]}
          onValueChange={([v]) => update({ blur: v })}
          disabled={!wallpaper.fileId}
        />
      </div>

      <div className="ml-8 space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("ed_brightness")}</Label>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{value.brightness}%</span>
        </div>
        <Slider
          min={20}
          max={150}
          step={1}
          value={[value.brightness]}
          onValueChange={([v]) => update({ brightness: v })}
          disabled={!wallpaper.fileId}
        />
      </div>

    </div>
  );
}
