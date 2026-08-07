import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { resolveVaultBlob } from "@/lib/vault-blob";
import { Loader2, ImageOff } from "@/lib/heroicons";

function VaultImageView({ node }: NodeViewProps) {
  const vaultId: string | null = node.attrs.vaultId ?? null;
  const alt: string = node.attrs.alt ?? "";
  const [src, setSrc] = useState<string | null>(node.attrs.src || null);
  const [error, setError] = useState(false);
  const [lightbox, setLightbox] = useState(false);

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
          <ImageOff className="h-4 w-4" /> Failed to load image
        </div>
      ) : src ? (
        <>
          <img
            src={src}
            alt={alt}
            onClick={() => setLightbox(true)}
            className="rounded-lg max-w-full h-auto cursor-zoom-in"
            draggable={false}
          />
          {lightbox && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
              onClick={() => setLightbox(false)}
            >
              <img src={src} alt={alt} className="max-h-[92vh] max-w-[96vw] rounded-lg object-contain" />
              <button
                type="button"
                aria-label="Close image"
                onClick={() => setLightbox(false)}
                className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs uppercase tracking-wider text-white/70 hover:text-white"
              >
                Close
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-6 text-sm text-muted-foreground justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading image…
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const VaultImage = Node.create({
  name: "vaultImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      vaultId: { default: null },
      alt: { default: null },
      src: { default: null }, // optional fallback for non-vault images
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[data-vault-id]",
        getAttrs: (el) => ({
          vaultId: (el as HTMLElement).getAttribute("data-vault-id"),
          alt: (el as HTMLElement).getAttribute("alt"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { vaultId, src, alt } = HTMLAttributes as any;
    return [
      "img",
      mergeAttributes(
        { "data-vault-id": vaultId ?? undefined, alt: alt ?? undefined, src: src ?? undefined },
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VaultImageView);
  },
});
