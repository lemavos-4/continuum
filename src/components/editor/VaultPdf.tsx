import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { resolveVaultBlob } from "@/lib/vault-blob";
import { FileText, Loader2, ExternalLink } from "@/lib/heroicons";

function VaultPdfView({ node }: NodeViewProps) {
  const vaultId: string | null = node.attrs.vaultId ?? null;
  const fileName: string = node.attrs.fileName ?? "Document.pdf";
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!vaultId) return;
    resolveVaultBlob(vaultId)
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [vaultId]);

  return (
    <NodeViewWrapper as="div" className="my-4">
      <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{fileName}</span>
          </div>
          {src && (
            <a href={src} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Open <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {error ? (
          <div className="p-6 text-sm text-destructive text-center">Failed to load PDF</div>
        ) : src ? (
          <iframe src={src} title={fileName} className="w-full h-[600px] bg-white" />
        ) : (
          <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading PDF…
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const VaultPdf = Node.create({
  name: "vaultPdf",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      vaultId: { default: null },
      fileName: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-vault-pdf]", getAttrs: (el) => ({
      vaultId: (el as HTMLElement).getAttribute("data-vault-id"),
      fileName: (el as HTMLElement).getAttribute("data-file-name"),
    }) }];
  },

  renderHTML({ HTMLAttributes }) {
    const { vaultId, fileName } = HTMLAttributes as any;
    return ["div", mergeAttributes({
      "data-vault-pdf": "true",
      "data-vault-id": vaultId ?? undefined,
      "data-file-name": fileName ?? undefined,
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VaultPdfView);
  },
});
