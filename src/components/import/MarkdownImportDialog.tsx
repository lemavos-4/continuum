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

  const reset = useCallback(() => {
    setStep("upload");
    setPreview(null);
    setDecisions({});
    setResult(null);
    setProgress(0);
    setBusy(false);
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const all = Array.from(fileList);
      const files = all.filter((f) => /\.md$/i.test(f.name));
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
  }, [preview, decisions, onImported, toast]);

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
      <DialogContent className="max-w-3xl bg-black/95 border border-white/10 text-white p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/10">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">Onboarding</p>
          <DialogTitle className="font-serif text-2xl tracking-tight text-white mt-2">
            Import Markdown
          </DialogTitle>
          <p className="text-xs text-white/50 mt-1">
            Upload .md files or a whole folder. We will detect people, projects and topics — you confirm what becomes an entity.
          </p>
        </DialogHeader>

        <div className="p-6 min-h-[360px] max-h-[70vh] overflow-y-auto">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFiles(e.dataTransfer.files);
                }}
                className="border border-dashed border-white/15 rounded-sm p-10 text-center hover:border-white/30 transition-colors"
              >
                <ArrowUpTrayIcon className="w-8 h-8 mx-auto text-white/40" />
                <p className="text-sm text-white/70 mt-3">Drag .md files here</p>
                <p className="text-xs text-white/40 mt-1">or pick from your device</p>
                <div className="flex items-center justify-center gap-2 mt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                    className="border-white/15 bg-transparent text-white/80 hover:bg-white/5"
                  >
                    Select files
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={busy}
                    className="border-white/15 bg-transparent text-white/80 hover:bg-white/5"
                  >
                    Select folder
                  </Button>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".md,.markdown,.txt"
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
              <div className="grid grid-cols-3 gap-3">
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
                  Detected entities — confirm or change type
                </h3>
                {preview.candidates.length === 0 ? (
                  <p className="text-xs text-white/40">No candidates detected. Notes will still be imported.</p>
                ) : (
                  <ul className="space-y-1 max-h-72 overflow-y-auto pr-2">
                    {preview.candidates.map((c) => {
                      const d = decisions[c.key] ?? { accept: false, type: c.suggestedType, name: c.name };
                      return (
                        <li key={c.key} className="flex items-center gap-3 py-2 border-b border-white/[0.04]">
                          <input
                            type="checkbox"
                            checked={d.accept}
                            onChange={(e) =>
                              setDecisions((s) => ({ ...s, [c.key]: { ...d, accept: e.target.checked } }))
                            }
                            className="w-3.5 h-3.5 accent-white/80"
                            disabled={c.existing}
                          />
                          <input
                            type="text"
                            value={d.name}
                            onChange={(e) =>
                              setDecisions((s) => ({ ...s, [c.key]: { ...d, name: e.target.value } }))
                            }
                            className="flex-1 bg-transparent border-b border-white/10 text-sm text-white/90 focus:border-white/40 focus:outline-none px-0 py-1"
                          />
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
                          <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 w-14 text-right tabular-nums">
                            {c.existing ? "exists" : `${c.occurrences}×`}
                          </span>
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

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  disabled={busy}
                  className="text-white/60 hover:text-white"
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleCommit}
                  disabled={busy}
                  className="bg-white text-black hover:bg-white/90"
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                  className="bg-white text-black hover:bg-white/90"
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
    <div className="border border-white/5 bg-white/[0.02] p-4 rounded-sm">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{label}</p>
      <p className="text-2xl font-serif text-white mt-1 tabular-nums">{value}</p>
    </div>
  );
}