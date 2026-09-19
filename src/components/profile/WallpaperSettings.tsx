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
  resolveVaultBlobFast,
  saveWallpaperSettings,
  subscribeWallpaper,
  uploadWallpaper,
  type NoteWallpaperSettings,
} from "@/lib/note-wallpaper";
import { loadNoteFontSize, subscribeNoteFontSize } from "@/lib/note-font-size";

export default function WallpaperSettings() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [wallpaper, setWallpaper] = useState<NoteWallpaperSettings>(() => loadWallpaperSettings());
  const [noteFontSize, setNoteFontSize] = useState(() => loadNoteFontSize());
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribeWallpaper = subscribeWallpaper(setWallpaper);
    const unsubscribeFont = subscribeNoteFontSize(setNoteFontSize);
    return () => {
      unsubscribeWallpaper();
      unsubscribeFont();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!wallpaper.fileId) { setUrl(null); return; }
    resolveVaultBlobFast(wallpaper.fileId)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
  }, [wallpaper.fileId]);

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
    saveWallpaperSettings({ ...wallpaper, ...patch });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
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

      {/* Live preview */}
      <div className="relative h-36 w-full overflow-hidden rounded-xl border border-border bg-accent">
        {url ? (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${url})`,
                filter: `blur(${wallpaper.blur}px) brightness(${wallpaper.brightness}%)`,
                transform: wallpaper.blur > 0 ? "scale(1.08)" : undefined,
              }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-background/55" />
          </>
        ) : null}
        <div className="relative flex h-full flex-col justify-center gap-2 px-5">
          <p
            className="font-serif text-foreground"
            style={{ fontSize: `${Math.max(1.15, 1.5 * (noteFontSize.titleScale / 100))}rem` }}
          >
            Lorem ipsum
          </p>
          <p
            className="max-w-sm leading-relaxed text-muted-foreground"
            style={{ fontSize: `${Math.max(0.7, 0.88 * (noteFontSize.bodyScale / 100))}rem` }}
          >
            {url ? t("ed_wallpaper_note") : t("ed_upload_image")}
          </p>
        </div>
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
        className="w-full gap-2 normal-case"
      >
        {uploading ? (
          <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> {t("ed_uploading")}</>
        ) : (
          <><PhotoIcon className="h-3.5 w-3.5" /> {wallpaper.fileId ? t("ed_replace_image") : t("ed_upload_image")}</>
        )}
      </Button>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("ed_blur")}</Label>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{wallpaper.blur}px</span>
        </div>
        <Slider
          min={0}
          max={40}
          step={1}
          value={[wallpaper.blur]}
          onValueChange={([v]) => update({ blur: v })}
          disabled={!wallpaper.fileId}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("ed_brightness")}</Label>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{wallpaper.brightness}%</span>
        </div>
        <Slider
          min={20}
          max={150}
          step={1}
          value={[wallpaper.brightness]}
          onValueChange={([v]) => update({ brightness: v })}
          disabled={!wallpaper.fileId}
        />
      </div>
    </div>
  );
}
