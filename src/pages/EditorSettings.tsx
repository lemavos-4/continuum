import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import WallpaperSettings from "@/components/profile/WallpaperSettings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { DEFAULT_NOTE_FONT_SIZE, loadNoteFontSize, saveNoteFontSize, subscribeNoteFontSize } from "@/lib/note-font-size";
import { loadWallpaperSettings, saveWallpaperSettings, type NoteWallpaperSettings } from "@/lib/note-wallpaper";

export default function EditorSettingsPage() {
  const { t } = useLanguage();
  const [draftNoteTitleScale, setDraftNoteTitleScale] = useState(() => loadNoteFontSize().titleScale);
  const [draftNoteBodyScale, setDraftNoteBodyScale] = useState(() => loadNoteFontSize().bodyScale);
  const [draftWallpaper, setDraftWallpaper] = useState<NoteWallpaperSettings>(() => loadWallpaperSettings());

  useEffect(() => subscribeNoteFontSize((settings) => {
    setDraftNoteTitleScale(settings.titleScale);
    setDraftNoteBodyScale(settings.bodyScale);
  }), []);

  const resetNoteFontScale = () => {
    setDraftNoteTitleScale(DEFAULT_NOTE_FONT_SIZE.titleScale);
    setDraftNoteBodyScale(DEFAULT_NOTE_FONT_SIZE.bodyScale);
  };

  const updateEditorSettings = () => {
    saveNoteFontSize({ titleScale: draftNoteTitleScale, bodyScale: draftNoteBodyScale });
    saveWallpaperSettings(draftWallpaper);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-6 sm:px-6 lg:px-10 lg:py-12">
        <section className="space-y-3">
          <h1 className="font-serif text-2xl text-foreground">{t("nav_editor")}</h1>
          <div className="divide-y divide-border/10">
            <div className="space-y-4 py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-start gap-4">
                  <AdjustmentsHorizontalIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-foreground/80">{t("profile_noteFontSize")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("profile_noteFontSizeDesc")}</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={resetNoteFontScale} className="h-7 px-2 text-[10px] normal-case">
                  {t("common_reset")}
                </Button>
              </div>
              <div className="ml-8 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("profile_fontTitle")}</Label>
                  <span className="font-mono text-[10px] text-muted-foreground">{draftNoteTitleScale}%</span>
                </div>
                <input type="range" min={80} max={180} step={5} value={draftNoteTitleScale} onChange={(event) => setDraftNoteTitleScale(Number(event.target.value))} className="w-full accent-primary" />
              </div>
              <div className="ml-8 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("profile_fontBody")}</Label>
                  <span className="font-mono text-[10px] text-muted-foreground">{draftNoteBodyScale}%</span>
                </div>
                <input type="range" min={80} max={180} step={5} value={draftNoteBodyScale} onChange={(event) => setDraftNoteBodyScale(Number(event.target.value))} className="w-full accent-primary" />
              </div>
            </div>
            <WallpaperSettings value={draftWallpaper} onChange={setDraftWallpaper} />
          </div>
          <Button type="button" variant="outline" onClick={updateEditorSettings} className="w-full normal-case sm:w-auto">
            {t("common_update")}
          </Button>
        </section>
      </div>
    </AppLayout>
  );
}