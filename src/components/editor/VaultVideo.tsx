import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { resolveVaultBlob } from "@/lib/vault-blob";
import { Loader2, ImageOff } from "@/lib/heroicons";

function VaultVideoView({ node }: NodeViewProps) {
  const vaultId: string | null = node.attrs.vaultId ?? null;
  const fileName: string = node.attrs.fileName ?? "video";
  const [src, setSrc] = useState<string | null>(node.attrs.src || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!vaultId) return;
    setError(false);
    resolveVaultBlob(vaultId)
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [vaultId]);

  return (
    <NodeViewWrapper as="div" className="my-4">
      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <ImageOff className="h-4 w-4" /> Failed to load video
        </div>
      ) : src ? (
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          aria-label={fileName}
          className="w-full max-w-full rounded-lg bg-black"
        />
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading video…
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const VaultVideo = Node.create({
  name: "vaultVideo",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      vaultId: { default: null },
      fileName: { default: null },
      src: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video[data-vault-id]",
        getAttrs: (el) => ({
          vaultId: (el as HTMLElement).getAttribute("data-vault-id"),
          fileName: (el as HTMLElement).getAttribute("data-file-name"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { vaultId, src, fileName } = HTMLAttributes as any;
    return [
      "video",
      mergeAttributes({
        "data-vault-id": vaultId ?? undefined,
        "data-file-name": fileName ?? undefined,
        src: src ?? undefined,
        controls: "true",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VaultVideoView);
  },
});