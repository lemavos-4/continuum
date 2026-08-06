import { useEffect, useState, useCallback, useRef } from "react";
import type { PointerEvent } from "react";
import type { Editor } from "@tiptap/core";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Code2,
  Minus,
  Type,
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
} from "@/lib/heroicons";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Props {
  editor: Editor | null;
}

interface Cmd {
  key: string;
  label: string;
  icon: typeof Type;
  run: (e: Editor, t?: (key: string) => string) => void;
  active?: (e: Editor) => boolean;
}

const COMMANDS: Cmd[] = [
  { key: "text", label: "ed_cmd_text", icon: Type, run: (e) => e.chain().focus().setNode("paragraph").run() },
  { key: "h1", label: "ed_cmd_h1", icon: Heading1, run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), active: (e) => e.isActive("heading", { level: 1 }) },
  { key: "h2", label: "ed_cmd_h2", icon: Heading2, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive("heading", { level: 2 }) },
  { key: "h3", label: "ed_cmd_h3", icon: Heading3, run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive("heading", { level: 3 }) },
  { key: "bold", label: "ed_cmd_bold", icon: Bold, run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive("bold") },
  { key: "italic", label: "ed_cmd_italic", icon: Italic, run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive("italic") },
  { key: "strike", label: "ed_cmd_strike", icon: Strikethrough, run: (e) => e.chain().focus().toggleStrike().run(), active: (e) => e.isActive("strike") },
  { key: "ul", label: "ed_cmd_ul", icon: List, run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
  { key: "ol", label: "ed_cmd_ol", icon: ListOrdered, run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
  { key: "task", label: "ed_cmd_task", icon: ListTodo, run: (e) => e.chain().focus().toggleTaskList().run(), active: (e) => e.isActive("taskList") },
  { key: "quote", label: "ed_cmd_quote", icon: Quote, run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive("blockquote") },
  { key: "code", label: "ed_cmd_code", icon: Code, run: (e) => e.chain().focus().toggleCode().run(), active: (e) => e.isActive("code") },
  { key: "codeblock", label: "ed_cmd_codeblock", icon: Code2, run: (e) => e.chain().focus().toggleCodeBlock().run(), active: (e) => e.isActive("codeBlock") },
  { key: "hr", label: "ed_cmd_hr", icon: Minus, run: (e) => e.chain().focus().setHorizontalRule().run() },
  {
    key: "link",
    label: "ed_cmd_link",
    icon: LinkIcon,
    run: (e, t) => {
      const url = window.prompt(t ? t("ed_prompt_url") : "URL");
      if (!url) return;
      e.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    },
  },
  {
    key: "image",
    label: "ed_cmd_image",
    icon: ImageIcon,
    run: (e, t) => {
      const url = window.prompt(t ? t("ed_prompt_image_url") : "Image URL");
      if (!url) return;
      e.chain().focus().setImage({ src: url }).run();
    },
  },
  { key: "table", label: "ed_cmd_table", icon: TableIcon, run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
];

export function MobileCommandBar({ editor }: Props) {
  const isMobile = useIsMobile();
  const { t } = useLanguage(); 
  const [offset, setOffset] = useState(0);
  const [kbOpen, setKbOpen] = useState(false);
  const pointerState = useRef<{ x: number; y: number; pointerId: number | null; cancelled: boolean }>({
    x: 0,
    y: 0,
    pointerId: null,
    cancelled: false,
  });

  // Track visual viewport for keyboard position.
  useEffect(() => {
    if (!isMobile || typeof window === "undefined") return;
    const vv = window.visualViewport;
    const update = () => {
      if (!vv) {
        setKbOpen(false);
        setOffset(0);
        return;
      }
      const kbHeight = window.innerHeight - vv.height - vv.offsetTop;
      // Consider keyboard "open" when at least 120px is occluded.
      const open = kbHeight > 120;
      setKbOpen(open);
      setOffset(open ? kbHeight : 0);
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isMobile]);

  const insert = useCallback(
    (cmd: Cmd) => {
      if (!editor) return;
      // Keep editor focused so keyboard stays open.
      cmd.run(editor, t);
    },
    [editor, t]
  );

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    pointerState.current.pointerId = e.pointerId;
    pointerState.current.x = e.clientX;
    pointerState.current.y = e.clientY;
    pointerState.current.cancelled = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (pointerState.current.pointerId !== e.pointerId) return;
    const dx = Math.abs(e.clientX - pointerState.current.x);
    const dy = Math.abs(e.clientY - pointerState.current.y);
    if (dx > 10 || dy > 10) {
      pointerState.current.cancelled = true;
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLButtonElement>, cmd: Cmd) => {
    if (pointerState.current.pointerId !== e.pointerId) return;
    const cancelled = pointerState.current.cancelled;
    pointerState.current.pointerId = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (cancelled) return;
    e.preventDefault();
    insert(cmd);
  };

  const handlePointerCancel = (e: PointerEvent<HTMLButtonElement>) => {
    if (pointerState.current.pointerId !== e.pointerId) return;
    pointerState.current.pointerId = null;
    pointerState.current.cancelled = true;
  };

  if (!isMobile || !editor) return null;
  if (!kbOpen) return null;

  return (
    <div
      role="toolbar"
      aria-label={t("editor_commands") || "Editor commands"}
      className={cn(
        "fixed left-2 right-2 z-[60] flex items-center gap-1 rounded-2xl border border-white/10",
        "bg-black/90 backdrop-blur-xl shadow-2xl px-2 py-1.5"
      )}
      style={{
        bottom: `calc(${offset}px + env(safe-area-inset-bottom, 0px) + 8px)`,
        touchAction: "pan-x",
      }}
      // Prevent iOS/Android from stealing focus from the editor.
      onPointerDown={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {COMMANDS.map((c) => {
            const Icon = c.icon;
            const active = c.active?.(editor) ?? false;
            return (
              <button
                key={c.key}
                type="button"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUp(e, c)}
                onPointerCancel={handlePointerCancel}
                onTouchStart={(e) => e.preventDefault()}
                onTouchEnd={(e) => e.preventDefault()}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 h-9 text-[12px] transition-colors",
                  active
                    ? "bg-white text-black"
                    : "bg-white/[0.06] text-white/80 hover:bg-white/10"
                )}
                aria-pressed={active}
                aria-label={t(c.label)}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t(c.label)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
