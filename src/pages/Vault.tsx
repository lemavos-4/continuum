import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { vaultApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Image as ImageIcon, File as FileGeneric,
  Loader2, HardDrive, Trash2, Music, ExternalLink,
} from "@/lib/heroicons";
import type { VaultFile } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { getPlanLimits } from "@/lib/plan";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { resolveVaultBlob, invalidateVaultBlob } from "@/lib/vault-blob";

type Category = "images" | "audio" | "pdf" | "other";

function categoryOf(file: VaultFile): Category {
  const t = (file.contentType || "").toLowerCase();
  const n = (file.fileName || "").toLowerCase();
  if (t.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/.test(n)) return "images";
  if (t.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac)$/.test(n)) return "audio";
  if (t === "application/pdf" || /\.pdf$/.test(n)) return "pdf";
  return "other";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useBlobUrl(fileId: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!fileId) return;
    setError(false);
    resolveVaultBlob(fileId)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [fileId]);
  return { url, error };
}

/* ── Componentes de Itens Modificados pro Novo Design ────────────────── */

function ImageThumb({ file, onDelete }: { file: VaultFile; onDelete: (f: VaultFile) => void }) {
  const { url, error } = useBlobUrl(file.id);
  return (
    <div className="group relative rounded-sm overflow-hidden border border-white/5 bg-black/10 aspect-square transition-colors hover:border-white/20">
      {error ? (
        <div className="flex items-center justify-center h-full text-[11px] text-red-400/70 font-mono">ERROR</div>
      ) : url ? (
        <img src={url} alt={file.fileName} className="w-full h-full object-cover transition-opacity duration-300 opacity-80 group-hover:opacity-100" />
      ) : (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-3 w-3 animate-spin text-white/20" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white/90 truncate">{file.fileName}</p>
        <p className="text-[10px] font-mono text-white/40 mt-0.5">{formatSize(file.size)}</p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-7 w-7 rounded-sm bg-black/40 text-white/40 hover:text-red-400 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all"
        onClick={() => onDelete(file)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function AudioPlayer({ file, onDelete }: { file: VaultFile; onDelete: (f: VaultFile) => void }) {
  const { url, error } = useBlobUrl(file.id);
  return (
    <div className="group relative flex flex-col justify-between rounded-sm border border-white/5 bg-black/10 p-4 transition-colors hover:border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-serif text-white/80 truncate group-hover:text-white transition-colors">{file.fileName}</p>
          <p className="text-[10px] font-mono text-white/30 mt-0.5">{formatSize(file.size)}</p>
        </div>
        <Button 
          type="button" 
          size="icon" 
          variant="ghost" 
          onClick={() => onDelete(file)} 
          className="h-7 w-7 rounded-sm text-white/20 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-white/5 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-4">
        {error ? (
          <p className="text-[11px] font-mono text-red-400/60">Failed to load audio source</p>
        ) : url ? (
          <audio src={url} controls className="w-full h-8 accent-white filter invert opacity-40 hover:opacity-70 transition-opacity" />
        ) : (
          <div className="flex items-center gap-2 text-[11px] font-mono text-white/30">
            <Loader2 className="h-3 w-3 animate-spin" /> Fetching payload...
          </div>
        )}
      </div>
    </div>
  );
}

function PdfCard({ file, onDelete, onOpen }: { file: VaultFile; onDelete: (f: VaultFile) => void; onOpen: (f: VaultFile) => void }) {
  const { url, error } = useBlobUrl(file.id);
  return (
    <div className="rounded-sm border border-white/5 bg-black/10 overflow-hidden flex flex-col transition-colors hover:border-white/10 group">
      <button type="button" onClick={() => onOpen(file)} className="aspect-[4/3] bg-black/40 relative overflow-hidden border-b border-white/5 flex items-center justify-center">
        {error ? (
          <div className="text-[11px] font-mono text-red-400/60">ERROR</div>
        ) : url ? (
          <iframe src={`${url}#toolbar=0&navpanes=0`} title={file.fileName} className="w-full h-full pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity" />
        ) : (
          <Loader2 className="h-3 w-3 animate-spin text-white/20" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[11px] bg-black border border-white/10 px-2.5 py-1 text-white/80 rounded-sm">View Document</span>
        </div>
      </button>
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-serif text-white/80 truncate group-hover:text-white">{file.fileName}</p>
          <p className="text-[10px] font-mono text-white/30 mt-0.5">{formatSize(file.size)}</p>
        </div>
        <div className="flex items-center shrink-0">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-sm text-white/30 hover:text-white hover:bg-white/5" onClick={() => onOpen(file)}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-sm text-white/30 hover:text-red-400 hover:bg-white/5" onClick={() => onDelete(file)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function OtherFileRow({ file, onDelete }: { file: VaultFile; onDelete: (f: VaultFile) => void }) {
  return (
    <div className="group relative flex items-center justify-between py-4 border-b border-white/[0.06] hover:bg-white/[0.01] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <FileGeneric className="w-3.5 h-3.5 text-white/30 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-serif text-white/80 truncate group-hover:text-white transition-colors">{file.fileName}</p>
          <p className="text-[10px] font-mono text-white/30 mt-0.5">
            {formatSize(file.size)} &middot; {new Date(file.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>
      <Button 
        type="button" 
        size="icon" 
        variant="ghost" 
        className="h-7 w-7 rounded-sm text-white/20 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-white/5 transition-all" 
        onClick={() => onDelete(file)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ── Main Vault Page Component ────────────────────────────────────────── */

export default function Vault() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<VaultFile | null>(null);
  const [pdfPreview, setPdfPreview] = useState<VaultFile | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { loading: authLoading } = useRequireAuth();
  const { applyUsageDelta } = usePlanGate();
  const limits = getPlanLimits(user);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data } = await vaultApi.list();
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error loading files", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const grouped = useMemo(() => {
    const g: Record<Category, VaultFile[]> = { images: [], audio: [], pdf: [], other: [] };
    for (const f of files) g[categoryOf(f)].push(f);
    return g;
  }, [files]);

  const confirmDelete = async () => {
    const file = pendingDelete;
    if (!file) return;
    setPendingDelete(null);
    try {
      await vaultApi.delete(file.id);
      invalidateVaultBlob(file.id);
      setFiles((cur) => cur.filter((f) => f.id !== file.id));
      applyUsageDelta({ vaultSizeMB: -Number((file.size / (1024 * 1024)).toFixed(2)) });
      toast({ title: "File removed from vault" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const pdfPreviewBlob = useBlobUrl(pdfPreview?.id ?? null);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      </AppLayout>
    );
  }

  const vaultUsedMB = files.reduce((t, f) => t + f.size / (1024 * 1024), 0);
  const vaultMaxMB = limits.maxVaultSizeMB;
  const vaultPct = vaultMaxMB === -1 ? 0 : Math.min((vaultUsedMB / vaultMaxMB) * 100, 100);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-12 lg:py-16">
        <main className="min-w-0 flex-1">
          
          {/* Cabeçalho idêntico ao do Notes e do TimeTracking */}
          <header className="mb-8">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">
                Storage
              </p>
              <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">
                Vault
              </h1>
            </div>
            <p className="mt-3 text-sm text-white/40">
              Browse and manage your stored assets. Uploads happen natively by dragging items into your notes.
            </p>
          </header>

          {/* Indicador de Espaço Sutil (Removido o bloco chamativo) */}
          <div className="mb-6 border-b border-white/5 pb-5 pt-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-white/40 mb-2">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3 h-3 text-white/30" />
                <span>VOLUME CAPACITY</span>
              </div>
              <span>
                {vaultMaxMB === -1 ? `${vaultUsedMB.toFixed(1)} MB` : `${vaultUsedMB.toFixed(1)} / ${vaultMaxMB} MB`}
              </span>
            </div>
            <Progress value={vaultMaxMB === -1 ? 0 : vaultPct} className="h-[2px] bg-white/5 text-white" />
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-5 w-5 animate-spin text-white/30" />
            </div>
          ) : files.length === 0 ? (
            /* Empty State poético e limpo igual ao do seu Notes */
            <div className="py-24 text-center">
              <p className="font-serif text-2xl italic text-white/40">
                Your vault is still empty.
              </p>
            </div>
          ) : (
            
            /* Tabs minimalistas estilo Notion/Axiom UI */
            <Tabs defaultValue="images" className="w-full">
              <TabsList className="flex items-center gap-4 bg-transparent border-b border-white/5 p-0 rounded-none h-10 w-full justify-start">
                <TabsTrigger value="images" className="bg-transparent border-b-2 border-transparent px-1 py-2 text-xs text-white/45 data-[state=active]:border-white data-[state=active]:text-white rounded-none shadow-none transition-all">
                  Photos <span className="font-mono text-[10px] text-white/30 ml-1">({grouped.images.length})</span>
                </TabsTrigger>
                <TabsTrigger value="audio" className="bg-transparent border-b-2 border-transparent px-1 py-2 text-xs text-white/45 data-[state=active]:border-white data-[state=active]:text-white rounded-none shadow-none transition-all">
                  Audio <span className="font-mono text-[10px] text-white/30 ml-1">({grouped.audio.length})</span>
                </TabsTrigger>
                <TabsTrigger value="pdf" className="bg-transparent border-b-2 border-transparent px-1 py-2 text-xs text-white/45 data-[state=active]:border-white data-[state=active]:text-white rounded-none shadow-none transition-all">
                  PDFs <span className="font-mono text-[10px] text-white/30 ml-1">({grouped.pdf.length})</span>
                </TabsTrigger>
                <TabsTrigger value="other" className="bg-transparent border-b-2 border-transparent px-1 py-2 text-xs text-white/45 data-[state=active]:border-white data-[state=active]:text-white rounded-none shadow-none transition-all">
                  Other <span className="font-mono text-[10px] text-white/30 ml-1">({grouped.other.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="images" className="mt-8 outline-none">
                {grouped.images.length === 0 ? (
                  <p className="text-sm font-serif italic text-white/30 py-12">No images preserved.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {grouped.images.map((f) => (
                      <ImageThumb key={f.id} file={f} onDelete={setPendingDelete} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="audio" className="mt-8 outline-none">
                {grouped.audio.length === 0 ? (
                  <p className="text-sm font-serif italic text-white/30 py-12">No audio tracks recorded.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {grouped.audio.map((f) => (
                      <AudioPlayer key={f.id} file={f} onDelete={setPendingDelete} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pdf" className="mt-8 outline-none">
                {grouped.pdf.length === 0 ? (
                  <p className="text-sm font-serif italic text-white/30 py-12">No document sheets mapped.</p>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    {grouped.pdf.map((f) => (
                      <PdfCard key={f.id} file={f} onDelete={setPendingDelete} onOpen={setPdfPreview} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="other" className="mt-8 outline-none">
                {grouped.other.length === 0 ? (
                  <p className="text-sm font-serif italic text-white/30 py-12">No additional files categorized.</p>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {grouped.other.map((f) => (
                      <OtherFileRow key={f.id} file={f} onDelete={setPendingDelete} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>

      {/* CONFIRM DIALOG — Adaptado para seguir o design limpo do app */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="bg-black border border-white/10 rounded-sm max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl font-normal text-white">Remove file?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40 text-xs mt-2">
              "${pendingDelete?.fileName || "This asset"}" will be permanently expunged from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="bg-transparent hover:bg-white/5 text-white/60 border-white/10 rounded-sm text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-white text-black hover:bg-white/90 rounded-sm text-xs font-medium">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL EXPANDIDO DE PREVIEW PDF */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col transition-all" onClick={() => setPdfPreview(null)}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-xl text-white">
            <p className="font-serif text-sm truncate max-w-xl">{pdfPreview.fileName}</p>
            <Button size="sm" variant="ghost" onClick={() => setPdfPreview(null)} className="text-white/40 hover:text-white rounded-sm hover:bg-white/5 text-xs">Close</Button>
          </div>
          <div className="flex-1 p-6" onClick={(e) => e.stopPropagation()}>
            {pdfPreviewBlob.url ? (
              <iframe src={pdfPreviewBlob.url} title={pdfPreview.fileName} className="w-full h-full bg-transparent border border-white/10 rounded-sm shadow-2xl" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-white/30" />
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}