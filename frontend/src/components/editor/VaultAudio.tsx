import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { resolveVaultBlob } from "@/lib/vault-blob";
import { Music, Loader2 } from "@/lib/heroicons";

function VaultAudioView({ node }: NodeViewProps) {
  const vaultId: string | null = node.attrs.vaultId ?? null;
  const fileName: string = node.attrs.fileName ?? "Audio";
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
      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Music className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium truncate">{fileName}</span>
        </div>
        {error ? (
          <div className="text-xs text-destructive">Failed to load audio</div>
        ) : src ? (
          <audio src={src} controls className="w-full" />
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading audio…
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const VaultAudio = Node.create({
  name: "vaultAudio",
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
    return [{ tag: "div[data-vault-audio]", getAttrs: (el) => ({
      vaultId: (el as HTMLElement).getAttribute("data-vault-id"),
      fileName: (el as HTMLElement).getAttribute("data-file-name"),
    }) }];
  },

  renderHTML({ HTMLAttributes }) {
    const { vaultId, fileName } = HTMLAttributes as any;
    return ["div", mergeAttributes({
      "data-vault-audio": "true",
      "data-vault-id": vaultId ?? undefined,
      "data-file-name": fileName ?? undefined,
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VaultAudioView);
  },
});
