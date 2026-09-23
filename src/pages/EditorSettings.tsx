import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import WallpaperSettings from "@/components/profile/WallpaperSettings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { AdjustmentsHorizontalIcon, ArrowLeftIcon, CheckIcon, EyeIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { DEFAULT_NOTE_FONT_SIZE, loadNoteFontSize, saveNoteFontSize, subscribeNoteFontSize } from "@/lib/note-font-size";
import { loadWallpaperSettings, resolveVaultBlobFast, saveWallpaperSettings, subscribeWallpaper, type NoteWallpaperSettings } from "@/lib/note-wallpaper";

export default function EditorSettingsPage() {
  const { t } = useLanguage();
  const [draftNoteTitleScale, setDraftNoteTitleScale] = useState(() => loadNoteFontSize().titleScale);
  const [draftNoteBodyScale, setDraftNoteBodyScale] = useState(() => loadNoteFontSize().bodyScale);
  const [draftWallpaper, setDraftWallpaper] = useState<NoteWallpaperSettings>(() => loadWallpaperSettings());
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);

  useEffect(() => subscribeNoteFontSize((settings) => {
    setDraftNoteTitleScale(settings.titleScale);
    setDraftNoteBodyScale(settings.bodyScale);
  }), []);

  useEffect(() => subscribeWallpaper(setDraftWallpaper), []);

  useEffect(() => {
    let active = true;
    if (!draftWallpaper.fileId) {
      setWallpaperUrl(null);
      return () => { active = false; };
    }
    resolveVaultBlobFast(draftWallpaper.fileId)
      .then((url) => { if (active) setWallpaperUrl(url); })
      .catch(() => { if (active) setWallpaperUrl(null); });
    return () => { active = false; };
  }, [draftWallpaper.fileId]);

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
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div>
          <h1 className="font-serif text-2xl text-foreground">{t("nav_editor")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("profile_noteFontSizeDesc")}</p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(290px,0.65fr)]">
          <section className="relative min-h-[430px] overflow-hidden border border-border/10 bg-background sm:min-h-[560px] lg:sticky lg:top-6 lg:h-[calc(100dvh-8rem)] lg:min-h-[600px]">
            {wallpaperUrl && (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${wallpaperUrl})`,
                  filter: `blur(${draftWallpaper.blur}px) brightness(${draftWallpaper.brightness}%)`,
                  transform: draftWallpaper.blur > 0 ? "scale(1.08)" : undefined,
                }}
              />
            )}
            {wallpaperUrl && <div aria-hidden="true" className="absolute inset-0 bg-background/55" />}

            <div className="relative flex h-full min-h-[430px] flex-col sm:min-h-[560px] lg:min-h-[600px]">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/10 bg-background/70 px-3 backdrop-blur-md">
                <Button type="button" variant="ghost" size="icon" aria-label={t("common_back")} className="pointer-events-none h-8 w-8">
                  <ArrowLeftIcon className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  <span className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground">
                    <CheckIcon className="h-3 w-3" /> {t("ed_saved")}
                  </span>
                  <Button type="button" variant="ghost" size="icon" aria-label={t("ed_view_mode")} className="pointer-events-none h-8 w-8 bg-foreground/5 text-foreground">
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={t("ed_toggle_side_panel")} className="pointer-events-none h-8 w-8 text-muted-foreground">
                    <Squares2X2Icon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden px-7 py-10 sm:px-12 sm:py-14">
                <div className="mx-auto max-w-[680px]">
                  <h2
                    className="font-display font-bold leading-tight text-foreground"
                    style={{ fontSize: `${Math.max(1.8, 3.1 * (draftNoteTitleScale / 100))}rem` }}
                  >
                    Lorem ipsum
                  </h2>
                  <div
                    className="mt-8 space-y-4 leading-relaxed text-foreground/85"
                    style={{ fontSize: `${draftNoteBodyScale}%` }}
                  >
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                    <h3 className="font-serif text-[1.35em] font-semibold text-foreground">Dolor sit amet</h3>
                    <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                    <blockquote className="border-l-2 border-border/20 pl-4 italic text-muted-foreground">
                      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.
                    </blockquote>
                  </div>
                </div>
              </div>

              <div className="flex h-8 shrink-0 items-center gap-3 border-t border-border/10 bg-background/55 px-3 font-mono text-[9px] text-muted-foreground backdrop-blur-md">
                <span>34 words</span><span>·</span><span>219 characters</span><span className="ml-auto">1 min read</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
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
            <Button type="button" variant="default" onClick={updateEditorSettings} className="w-full normal-case">
              <CheckIcon className="h-4 w-4" />
              {t("common_update")}
            </Button>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}