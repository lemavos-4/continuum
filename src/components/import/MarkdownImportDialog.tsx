import { useCallback, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
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
  const base = parts.at(-1) ?? file.name;
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
          title: "No Markdown files found",
          description: "Only .md files are supported. Other formats (images, audio, PDFs) are ignored.",
          variant: "destructive",
        });
        return;
      }
      if (skipped > 0) {
        toast({
          title: `${skipped} file${skipped === 1 ? "" : "s"} ignored`,
          description: "Only .md files are imported. Other formats were skipped.",
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
            title: "No importable notes",
            description: "Only valid UTF-8 .md files with content can be imported.",
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
            accept: (c.confidence === "HIGH" || c.confidence === "MEDIUM") && !c.existing,
            type: c.suggestedType,
            name: c.name,
          };
        }
        setDecisions(initial);
        setStep("review");
      } catch (e: any) {
        toast({
          title: "Import failed",
          description: e?.response?.data?.message || e?.message || "Could not parse files",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
        setProgress(0);
      }
    },
    [toast]
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
        title: "Import failed",
        description: e?.response?.data?.message || e?.message || "Could not commit import",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [preview, decisions, customEntities, onImported, toast]);

  const addCustomEntity = useCallback(() => {
    const name = customDraftName.trim();
    if (!name) return;
    if (BLOCKED_EXTENSION_BEFORE_MD.test(name) || name.includes("/") || name.includes("\\")) {
      toast({
        title: "Invalid entity name",
        description: "Files, paths and extensions are not valid entities.",
        variant: "destructive",
      });
      return;
    }
    const matches = preview?.files.filter((file) => textContainsEntity(tiptapPlainText(file.content), name)).length ?? 0;
    if (matches === 0) {
      toast({
        title: "Entity not found",
        description: "This name was not found in the notes selected for import.",
        variant: "destructive",
      });
      return;
    }
    const key = name.toLowerCase();
    setCustomEntities((s) =>
      s.some((c) => c.name.toLowerCase() === key) ? s : [...s, { name, type: customDraftType, matches }]
    );
    setCustomDraftName("");
  }, [customDraftName, customDraftType, preview, toast]);

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
      <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] sm:w-full max-h-[92vh] sm:max-h-[85vh] bg-black/95 border border-white/10 text-white p-0 overflow-hidden rounded-sm flex flex-col">
        <DialogHeader className="p-4 sm:p-6 border-b border-white/10 text-left">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">Onboarding</p>
          <DialogTitle className="font-serif text-xl sm:text-2xl tracking-tight text-white mt-2">
            Import Markdown
          </DialogTitle>
          <p className="text-xs text-white/50 mt-1 leading-relaxed">
            Upload .md files or a whole folder. Other formats are ignored. We detect people, projects and topics — you confirm what becomes an entity.
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
                className="border border-dashed border-white/15 rounded-sm p-6 sm:p-10 text-center hover:border-white/30 transition-colors"
              >
                <ArrowUpTrayIcon className="w-8 h-8 mx-auto text-white/40" />
                <p className="text-sm text-white/70 mt-3">Drop .md files here</p>
                <p className="text-xs text-white/40 mt-1">or pick from your device</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                    className="border-white/15 bg-transparent text-white/80 hover:bg-white/5 w-full sm:w-auto"
                  >
                    Select files
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={busy}
                    className="border-white/15 bg-transparent text-white/80 hover:bg-white/5 w-full sm:w-auto"
                  >
                    Select folder
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
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
              {busy && (
                <div className="space-y-2">
                  <p className="text-xs text-white/50">Parsing files…</p>
                  <Progress value={progress} className="h-[2px] bg-white/5 rounded-none" />
                </div>
              )}
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 pt-2">
                Limits: 200 files · 2 MB each · 25 MB total
              </p>
            </div>
          )}

          {step === "review" && preview && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Stat label="Files" value={preview.files.length} />
                <Stat label="Candidates" value={preview.candidates.length} />
                <Stat label="Accepted" value={acceptedCount} />
              </div>

              <section>
                <h3 className="text-[10px] uppercase tracking-[0.32em] text-white/40 mb-3">Files</h3>
                <ul className="space-y-1 max-h-40 overflow-y-auto pr-2">
                  {preview.files.map((f) => (
                    <li key={f.filename} className="flex items-center gap-2 text-xs text-white/70 py-1 border-b border-white/[0.04]">
                      <DocumentTextIcon className="w-3.5 h-3.5 text-white/30" />
                      <span className="truncate flex-1">{f.title}</span>
                      <span className="text-white/30 tabular-nums">{f.wordCount} w</span>
                    </li>
                  ))}
                </ul>
                {preview.skipped && preview.skipped.length > 0 && (
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mt-2">
                    {preview.skipped.length} skipped (duplicates or empty)
                  </p>
                )}
              </section>

              <section>
                <h3 className="text-[10px] uppercase tracking-[0.32em] text-white/40 mb-3">
                  Add your own entities
                </h3>
                <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
                  Type a name we missed. We'll scan every note for it and link it wherever it appears.
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
                    placeholder="e.g. Emilly, Project Phoenix…"
                    className="flex-1 min-w-0 bg-transparent border border-white/10 text-sm text-white/90 focus:border-white/40 focus:outline-none rounded-sm px-3 py-2"
                  />
                  <select
                    value={customDraftType}
                    onChange={(e) => setCustomDraftType(e.target.value as EntityType)}
                    className="bg-transparent border border-white/10 text-xs text-white/80 rounded-sm px-2 py-2 focus:outline-none focus:border-white/30"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t} className="bg-black">
                        {t}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCustomEntity}
                    disabled={busy || !customDraftName.trim()}
                    className="border-white/15 bg-transparent text-white/80 hover:bg-white/5"
                  >
                    Add
                  </Button>
                </div>
                {customEntities.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {customEntities.map((c, i) => (
                      <li
                        key={`${c.name}-${i}`}
                        className="flex items-center gap-2 border border-white/10 bg-white/[0.03] rounded-sm pl-2 pr-1 py-1"
                      >
                        <span className="text-xs text-white/90">{c.name}</span>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                          {c.type}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${c.name}`}
                          onClick={() =>
                            setCustomEntities((s) => s.filter((_, idx) => idx !== i))
                          }
                          className="text-white/40 hover:text-white px-1"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-[10px] uppercase tracking-[0.32em] text-white/40 mb-3">
                  Detected entities — confirm or change type
                </h3>
                {preview.candidates.length === 0 ? (
                  <p className="text-xs text-white/40">No candidates detected. Notes will still be imported.</p>
                ) : (
                  <ul className="space-y-1 max-h-72 overflow-y-auto pr-2">
                    {preview.candidates.map((c) => {
                      const d = decisions[c.key] ?? { accept: false, type: c.suggestedType, name: c.name };
                      return (
                        <li key={c.key} className="py-2 border-b border-white/[0.04]">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <input
                              type="checkbox"
                              checked={d.accept}
                              onChange={(e) =>
                                setDecisions((s) => ({ ...s, [c.key]: { ...d, accept: e.target.checked } }))
                              }
                              className="w-4 h-4 accent-white/80 shrink-0"
                              disabled={c.existing}
                            />
                            <input
                              type="text"
                              value={d.name}
                              onChange={(e) =>
                                setDecisions((s) => ({ ...s, [c.key]: { ...d, name: e.target.value } }))
                              }
                              className="flex-1 min-w-0 bg-transparent border-b border-white/10 text-sm text-white/90 focus:border-white/40 focus:outline-none px-0 py-1"
                            />
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 tabular-nums shrink-0">
                              {c.existing ? "exists" : `${c.occurrences}×`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 pl-6">
                            <select
                              value={d.type}
                              onChange={(e) =>
                                setDecisions((s) => ({ ...s, [c.key]: { ...d, type: e.target.value as EntityType } }))
                              }
                              className="bg-transparent border border-white/10 text-xs text-white/80 rounded-sm px-2 py-1 focus:outline-none focus:border-white/30"
                            >
                              {TYPES.map((t) => (
                                <option key={t} value={t} className="bg-black">
                                  {t}
                                </option>
                              ))}
                            </select>
                            {c.confidence && (
                              <span
                                className={
                                  "text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-sm border " +
                                  (c.confidence === "HIGH"
                                    ? "text-emerald-300/80 border-emerald-300/20 bg-emerald-300/5"
                                    : c.confidence === "MEDIUM"
                                    ? "text-sky-300/80 border-sky-300/20 bg-sky-300/5"
                                    : "text-white/40 border-white/10 bg-white/[0.02]")
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
                <div className="text-xs text-amber-300/70 border border-amber-300/20 bg-amber-300/5 p-3 rounded-sm">
                  {preview.errors.slice(0, 5).map((e) => (
                    <div key={e}>{e}</div>
                  ))}
                </div>
              )}

              {busy && <Progress value={progress} className="h-[2px] bg-white/5 rounded-none" />}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 sticky bottom-0 bg-black/95 -mx-4 sm:mx-0 px-4 sm:px-0 pb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  disabled={busy}
                  className="text-white/60 hover:text-white w-full sm:w-auto"
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleCommit}
                  disabled={busy}
                  className="bg-white text-black hover:bg-white/90 w-full sm:w-auto"
                >
                  {busy && <ArrowPathIcon className="w-3.5 h-3.5 mr-2 animate-spin" />}
                  Import {preview.files.length} {preview.files.length === 1 ? "file" : "files"}
                </Button>
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-8 h-8 text-emerald-400/80" />
                <div>
                  <p className="font-serif text-xl text-white">Import complete</p>
                  <p className="text-xs text-white/50">Your knowledge graph just grew.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
                <Stat label="Notes" value={result.notesCreated} />
                <Stat label="New entities" value={result.entitiesCreated} />
                <Stat label="Reused" value={result.entitiesReused} />
                <Stat label="Links" value={result.linksCreated} />
              </div>
              {result.errors.length > 0 && (
                <div className="text-xs text-amber-300/70 border border-amber-300/20 bg-amber-300/5 p-3 rounded-sm max-h-32 overflow-y-auto">
                  {result.errors.map((e) => (
                    <div key={e}>{e}</div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    reset();
                    onOpenChange(false);
                  }}
                  className="bg-white text-black hover:bg-white/90 w-full sm:w-auto"
                >
                  Done
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
    <div className="border border-white/5 bg-white/[0.02] p-3 sm:p-4 rounded-sm">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{label}</p>
      <p className="text-xl sm:text-2xl font-serif text-white mt-1 tabular-nums">{value}</p>
    </div>
  );
}