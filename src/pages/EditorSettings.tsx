import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
    saveNoteFontSize(DEFAULT_NOTE_FONT_SIZE);
  };

  const updateTitleScale = (value: number) => {
    setDraftNoteTitleScale(value);
    saveNoteFontSize({ titleScale: value, bodyScale: draftNoteBodyScale });
  };

  const updateBodyScale = (value: number) => {
    setDraftNoteBodyScale(value);
    saveNoteFontSize({ titleScale: draftNoteTitleScale, bodyScale: value });
  };

  const updateWallpaper = (value: NoteWallpaperSettings) => {
    setDraftWallpaper(value);
    saveWallpaperSettings(value);
  };

  return (
    <AppLayout>
      <div className="relative h-dvh min-h-[620px] overflow-hidden bg-background">
          <section className="absolute inset-0 overflow-hidden bg-background">
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

            <div className="relative flex h-full flex-col">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/10 bg-background/70 px-3 backdrop-blur-md">
                <Button type="button" variant="ghost" size="icon" aria-label={t("common_back")} onClick={() => navigate(-1)} className="h-8 w-8">
                  <ArrowLeftIcon className="h-4 w-4" />
                </Button>
                <span className="absolute left-1/2 -translate-x-1/2 font-serif text-sm text-foreground">{t("nav_editorSettings")}</span>
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

              <div className="flex-1 overflow-hidden px-7 py-10 pb-[28rem] sm:px-12 sm:py-14 sm:pb-[25rem] lg:pb-14 lg:pr-[25rem]">
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

              <div className="hidden h-8 shrink-0 items-center gap-3 border-t border-border/10 bg-background/55 px-3 font-mono text-[9px] text-muted-foreground backdrop-blur-md sm:flex">
                <span>34 words</span><span>·</span><span>219 characters</span><span className="ml-auto">1 min read</span>
              </div>
            </div>
          </section>

          <aside className="absolute inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] max-h-[calc(100dvh-7rem)] overflow-y-auto border border-border/10 bg-background/90 px-4 shadow-xl backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:px-5 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:top-20 lg:w-[360px] lg:max-h-none">
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
                <input type="range" min={80} max={180} step={5} value={draftNoteTitleScale} onChange={(event) => updateTitleScale(Number(event.target.value))} className="w-full accent-primary" />
              </div>
              <div className="ml-8 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("profile_fontBody")}</Label>
                  <span className="font-mono text-[10px] text-muted-foreground">{draftNoteBodyScale}%</span>
                </div>
                <input type="range" min={80} max={180} step={5} value={draftNoteBodyScale} onChange={(event) => updateBodyScale(Number(event.target.value))} className="w-full accent-primary" />
              </div>
            </div>
            <WallpaperSettings value={draftWallpaper} onChange={updateWallpaper} />
            </div>
          </aside>
      </div>
    </AppLayout>
  );
}