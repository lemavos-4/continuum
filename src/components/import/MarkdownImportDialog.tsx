import { useCallback, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { importApi } from "@/lib/api";
import { ArrowPathIcon, ArrowUpTrayIcon, CheckCircleIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

type Step = "upload" | "review" | "result";
type EntityType = "PERSON" | "PROJECT" | "TOPIC" | "ORGANIZATION" | "ACTIVITY";

interface PreviewFile {
  filename: string;
  title: string;
  content: unknown;
  candidateKeys: string[];
  wordCount: number;
}
interface PreviewCandidate {
  key: string;
  name: string;
  suggestedType: EntityType;
  occurrences: number;
  existing: boolean;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
}
interface PreviewResponse {
  files: PreviewFile[];
  candidates: PreviewCandidate[];
  errors: string[];
  skipped?: string[];
}
interface CommitResponse {
  notesCreated: number;
  entitiesCreated: number;
  entitiesReused: number;
  linksCreated: number;
  errors: string[];
}

const TYPES: EntityType[] = ["PERSON", "PROJECT", "TOPIC", "ORGANIZATION", "ACTIVITY"];
const BLOCKED_EXTENSION_BEFORE_MD = /\.(png|jpe?g|gif|webp|svg|bmp|tiff?|heic|mp3|wav|m4a|ogg|opus|flac|aac|mp4|mov|webm|avi|mkv|pdf|docx?|xlsx?|pptx?|csv|tsv|zip|rar|7z|tar|gz|exe|dmg|apk|html?|css|js|ts|tsx|jsx|json|xml|yaml|yml)$/i;
const BINARY_MIME = /^(audio|video|image)\//i;

const uploadPath = (file: File) =>
  (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;

const isStrictMarkdownFile = (file: File) => {
  const path = uploadPath(file).replace(/\\/g, "/");
  const parts = path.split("/").filter(Boolean);
  const base = parts[parts.length - 1] ?? file.name;
  if (!base || parts.some((part) => part.startsWith("."))) return false;
  if (!/^[^/\\]+\.md$/i.test(base)) return false;
  const stem = base.slice(0, -3);
  if (BLOCKED_EXTENSION_BEFORE_MD.test(stem)) return false;
  if (file.type && BINARY_MIME.test(file.type)) return false;
  return true;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const tiptapPlainText = (node: unknown): string => {
  if (!node || typeof node !== "object") return "";
  const record = node as { type?: string; text?: string; attrs?: { label?: string }; content?: unknown[] };
  if (record.type === "text") return record.text ?? "";
  if (record.type === "mention") return record.attrs?.label ?? "";
  return Array.isArray(record.content) ? record.content.map(tiptapPlainText).join(" ") : "";
};

const normalizeSearchText = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

const textContainsEntity = (plainText: string, name: string) => {
  const normalizedText = normalizeSearchText(plainText);
  const normalizedName = normalizeSearchText(name);
  if (!normalizedName) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(normalizedName)}($|[^\\p{L}\\p{N}])`, "u").test(normalizedText);
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}

export default function MarkdownImportDialog({ open, onOpenChange, onImported }: Props) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [decisions, setDecisions] = useState<Record<string, { accept: boolean; type: EntityType; name: string }>>({});
  const [result, setResult] = useState<CommitResponse | null>(null);
  const [customEntities, setCustomEntities] = useState<{ name: string; type: EntityType; matches: number }[]>([]);
  const [customDraftName, setCustomDraftName] = useState("");
  const [customDraftType, setCustomDraftType] = useState<EntityType>("PERSON");

  const reset = useCallback(() => {
    setStep("upload");
    setPreview(null);
    setDecisions({});
    setResult(null);
    setProgress(0);
    setBusy(false);
    setCustomEntities([]);
    setCustomDraftName("");
    setCustomDraftType("PERSON");
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const all = Array.from(fileList);
      const files = all.filter(isStrictMarkdownFile);
      const skipped = all.length - files.length;
      if (files.length === 0) {
        toast({
          title: t("import_noMdTitle"),
          description: t("import_noMdDesc"),
          variant: "destructive",
        });
        return;
      }
      if (skipped > 0) {
        toast({
          title: t(skipped === 1 ? "import_skippedTitle_one" : "import_skippedTitle", { n: skipped }),
          description: t("import_skippedDesc"),
        });
      }
      setBusy(true);
      setProgress(15);
      try {
        const res = await importApi.previewMarkdown(files);
        setProgress(90);
        const data = res.data as PreviewResponse;
        if (data.files.length === 0) {
          toast({
            title: t("import_noImportableTitle"),
            description: t("import_noImportableDesc"),
            variant: "destructive",
          });
          return;
        }
        setPreview(data);
        const initial: Record<string, { accept: boolean; type: EntityType; name: string }> = {};
        for (const c of data.candidates) {
          initial[c.key] = {
            // Auto-accept anything the AI or wiki-links/frontmatter surfaced.
            // LOW = pure capitalisation heuristic → user opts in manually.
            accept: c.existing || c.confidence === "HIGH" || c.confidence === "MEDIUM",
            type: c.suggestedType,
            name: c.name,
          };
        }
        setDecisions(initial);
        setStep("review");
      } catch (e: any) {
        toast({
          title: t("import_failedTitle"),
          description: e?.response?.data?.message || e?.message || t("import_parseFailedDesc"),
          variant: "destructive",
        });
      } finally {
        setBusy(false);
        setProgress(0);
      }
    },
    [toast, t]
  );

  const handleCommit = useCallback(async () => {
    if (!preview) return;
    setBusy(true);
    setProgress(20);
    try {
      const payload = {
        files: preview.files.map((f) => ({
          filename: f.filename,
          title: f.title,
          content: f.content,
          candidateKeys: f.candidateKeys,
        })),
        entities: preview.candidates.map((c) => {
          const d = decisions[c.key];
          return {
            key: c.key,
            name: d?.name ?? c.name,
            type: d?.type ?? c.suggestedType,
            accept: d?.accept ?? false,
          };
        }),
        customEntities: customEntities.map((c) => ({ name: c.name, type: c.type })),
      };
      setProgress(60);
      const res = await importApi.commitMarkdown(payload);
      setResult(res.data as CommitResponse);
      setProgress(100);
      setStep("result");
      onImported?.();
    } catch (e: any) {
      toast({
        title: t("import_failedTitle"),
        description: e?.response?.data?.message || e?.message || t("import_commitFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [preview, decisions, customEntities, onImported, toast, t]);

  const handleRelink = useCallback(async () => {
    setBusy(true);
    try {
      const res = await importApi.relinkEntities();
      const data = res.data as { notesUpdated: number; connectionsCreated: number };
      toast({
        title: t("import_relinkDoneTitle"),
        description: t("import_relinkDoneDesc", {
          n: data.connectionsCreated,
          notes: data.notesUpdated,
        }),
      });
      onImported?.();
    } catch (e: any) {
      toast({
        title: t("import_failedTitle"),
        description: e?.response?.data?.message || e?.message || t("import_commitFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [onImported, toast, t]);

  const addCustomEntity = useCallback(() => {
    const name = customDraftName.trim();
    if (!name) return;
    if (BLOCKED_EXTENSION_BEFORE_MD.test(name) || name.includes("/") || name.includes("\\")) {
      toast({
        title: t("import_invalidNameTitle"),
        description: t("import_invalidNameDesc"),
        variant: "destructive",
      });
      return;
    }
    const matches = preview?.files.filter((file) => textContainsEntity(tiptapPlainText(file.content), name)).length ?? 0;
    if (matches === 0) {
      toast({
        title: t("import_notFoundTitle"),
        description: t("import_notFoundDesc"),
        variant: "destructive",
      });
      return;
    }
    const key = name.toLowerCase();
    setCustomEntities((s) =>
      s.some((c) => c.name.toLowerCase() === key) ? s : [...s, { name, type: customDraftType, matches }]
    );
    setCustomDraftName("");
  }, [customDraftName, customDraftType, preview, toast, t]);

  const acceptedCount = useMemo(
    () => Object.values(decisions).filter((d) => d.accept).length,
    [decisions]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] sm:w-full max-h-[92vh] sm:max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="space-y-0 p-4 sm:p-6 border-b border-border/10 text-left">
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{t("import_eyebrow")}</p>
          <DialogTitle className="font-serif text-xl sm:text-2xl tracking-tight text-foreground mt-2">
            {t("profile_importMd")}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t("import_headerDesc")}
          </p>
        </DialogHeader>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFiles(e.dataTransfer.files);
                }}
                className="border border-dashed border-border/10 rounded-sm p-6 sm:p-10 text-center hover:border-foreground/25 transition-colors"
              >
                <ArrowUpTrayIcon className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-foreground/80 mt-3">{t("import_dropHere")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("import_orPick")}</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                    className="w-full sm:w-auto"
                  >
                    {t("import_selectFiles")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={busy}
                    className="w-full sm:w-auto"
                  >
                    {t("import_selectFolder")}
                  </Button>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".md"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  /* @ts-expect-error non-standard */
                  webkitdirectory=""
                  directory=""
                  accept=".md"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
              {busy && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t("import_parsing")}</p>
                  <Progress value={progress} className="h-[2px] bg-accent rounded-none" />
                </div>
              )}
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 pt-2">
                {t("import_limits")}
              </p>
            </div>
          )}

          {step === "review" && preview && (
            <div className="space-y-6">
              <dl className="grid grid-cols-3 gap-3 text-xs sm:gap-4">
                <Stat label={t("import_stat_files")} value={preview.files.length} />
                <Stat label={t("import_stat_candidates")} value={preview.candidates.length} />
                <Stat label={t("import_stat_accepted")} value={acceptedCount} />
              </dl>

              <section className="border-t border-border/10 pt-5">
                <h3 className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">{t("import_stat_files")}</h3>
                <ul className="space-y-1 max-h-40 overflow-y-auto pr-2">
                  {preview.files.map((f) => (
                    <li key={f.filename} className="flex items-center gap-2 text-xs text-foreground/80 py-1 border-b border-border/10">
                      <DocumentTextIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="truncate flex-1">{f.title}</span>
                      <span className="text-muted-foreground tabular-nums">{f.wordCount} w</span>
                    </li>
                  ))}
                </ul>
                {preview.skipped && preview.skipped.length > 0 && (
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mt-2">
                    {t(preview.skipped.length === 1 ? "import_skippedCount_one" : "import_skippedCount", { n: preview.skipped.length })}
                  </p>
                )}
              </section>

              <section className="border-t border-border/10 pt-5">
                <h3 className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
                  {t("import_addOwnTitle")}
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                  {t("import_addOwnDesc")}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customDraftName}
                    onChange={(e) => setCustomDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomEntity();
                      }
                    }}
                    placeholder={t("import_addOwnPlaceholder")}
                    className="flex-1 min-w-0 bg-transparent border border-border/10 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none rounded-sm px-3 py-2"
                  />
                  <select
                    value={customDraftType}
                    onChange={(e) => setCustomDraftType(e.target.value as EntityType)}
                    className="bg-transparent border border-border/10 text-xs text-foreground/80 rounded-sm px-2 py-2 focus:outline-none focus:border-foreground/30"
                  >
                    {TYPES.map((opt) => (
                      <option key={opt} value={opt} className="bg-[hsl(var(--popup-background))] text-[hsl(var(--popup-foreground))]">
                        {opt}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCustomEntity}
                    disabled={busy || !customDraftName.trim()}
                  >
                    {t("import_addBtn")}
                  </Button>
                </div>
                {customEntities.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {customEntities.map((c, i) => (
                      <li
                        key={`${c.name}-${i}`}
                        className="flex items-center gap-2 border border-border/10 bg-accent/60 rounded-sm pl-2 pr-1 py-1"
                      >
                        <span className="text-xs text-foreground/90">{c.name}</span>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                          {c.type}
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80">
                          {t(c.matches === 1 ? "import_matchesCount_one" : "import_matchesCount", { n: c.matches })}
                        </span>
                        <button
                          type="button"
                          aria-label={t("import_removeEntity", { name: c.name })}
                          onClick={() =>
                            setCustomEntities((s) => s.filter((_, idx) => idx !== i))
                          }
                          className="text-muted-foreground hover:text-foreground px-1"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="border-t border-border/10 pt-5">
                <h3 className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
                  {t("import_detectedTitle")}
                </h3>
                {preview.candidates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("import_noCandidates")}</p>
                ) : (
                  <ul className="space-y-1 max-h-72 overflow-y-auto pr-2">
                    {preview.candidates.map((c) => {
                      const d = decisions[c.key] ?? { accept: false, type: c.suggestedType, name: c.name };
                      return (
                        <li key={c.key} className="py-2 border-b border-border/10">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <input
                              type="checkbox"
                              checked={d.accept}
                              onChange={(e) =>
                                setDecisions((s) => ({ ...s, [c.key]: { ...d, accept: e.target.checked } }))
                              }
                              className="w-4 h-4 accent-foreground shrink-0"
                              disabled={c.existing}
                            />
                            <input
                              type="text"
                              value={d.name}
                              onChange={(e) =>
                                setDecisions((s) => ({ ...s, [c.key]: { ...d, name: e.target.value } }))
                              }
                              className="flex-1 min-w-0 bg-transparent border-b border-border/10 text-sm text-foreground focus:border-foreground/40 focus:outline-none px-0 py-1"
                            />
                            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums shrink-0">
                              {c.existing ? t("import_exists") : `${c.occurrences}×`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 pl-6">
                            <select
                              value={d.type}
                              onChange={(e) =>
                                setDecisions((s) => ({ ...s, [c.key]: { ...d, type: e.target.value as EntityType } }))
                              }
                              className="bg-transparent border border-border/10 text-xs text-foreground/80 rounded-sm px-2 py-1 focus:outline-none focus:border-foreground/30"
                            >
                              {TYPES.map((opt) => (
                                <option key={opt} value={opt} className="bg-[hsl(var(--popup-background))] text-[hsl(var(--popup-foreground))]">
                                  {opt}
                                </option>
                              ))}
                            </select>
                            {c.confidence && (
                              <span
                                className={
                                  "cx-badge " +
                                  (c.confidence === "HIGH"
                                    ? "cx-badge-success"
                                    : c.confidence === "MEDIUM"
                                    ? "cx-badge-info"
                                    : "cx-badge-neutral")
                                }
                              >
                                {c.confidence}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {preview.errors.length > 0 && (
                <div className="text-xs text-warning border border-warning/20 bg-warning/5 p-3 rounded-sm">
                  {preview.errors.slice(0, 5).map((e) => (
                    <div key={e}>{e}</div>
                  ))}
                </div>
              )}

              {busy && <Progress value={progress} className="h-[2px] bg-accent rounded-none" />}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 sticky bottom-0 bg-[hsl(var(--popup-background))] -mx-4 sm:mx-0 px-4 sm:px-0 pb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  disabled={busy}
                  className="w-full sm:w-auto"
                >
                  {t("common_back")}
                </Button>
                <Button
                  variant="white"
                  size="sm"
                  onClick={handleCommit}
                  disabled={busy}
                  className="w-full sm:w-auto"
                >
                  {busy && <ArrowPathIcon className="w-3.5 h-3.5 mr-2 animate-spin" />}
                  {t(preview.files.length === 1 ? "import_commitBtn_one" : "import_commitBtn", { n: preview.files.length })}
                </Button>
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-8 h-8 text-success" />
                <div>
                  <p className="font-serif text-xl text-foreground">{t("import_completeTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("import_completeDesc")}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 border-t border-border/10 pt-5 text-xs sm:grid-cols-4 sm:gap-4">
                <Stat label={t("import_stat_notes")} value={result.notesCreated} />
                <Stat label={t("import_stat_newEntities")} value={result.entitiesCreated} />
                <Stat label={t("import_stat_reused")} value={result.entitiesReused} />
                <Stat label={t("import_stat_links")} value={result.linksCreated} />
              </dl>
              {result.errors.length > 0 && (
                <div className="text-xs text-warning border border-warning/20 bg-warning/5 p-3 rounded-sm max-h-32 overflow-y-auto">
                  {result.errors.map((e) => (
                    <div key={e}>{e}</div>
                  ))}
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRelink}
                  disabled={busy}
                  className="w-full sm:w-auto"
                >
                  {busy && <ArrowPathIcon className="w-3.5 h-3.5 mr-2 animate-spin" />}
                  {t("import_relinkBtn")}
                </Button>
                <Button
                  variant="white"
                  size="sm"
                  onClick={() => {
                    reset();
                    onOpenChange(false);
                  }}
                  className="w-full sm:w-auto"
                >
                  {t("import_doneBtn")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-serif text-lg sm:text-xl text-foreground/90 tabular-nums">{value}</dd>
    </div>
  );
}
