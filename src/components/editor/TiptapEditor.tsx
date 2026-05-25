import { useEditor, EditorContent, ReactRenderer, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useNavigate } from "react-router-dom";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import Dropcursor from "@tiptap/extension-dropcursor";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react";
import type { ChangeEvent } from "react";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import {
  Bold, Italic, Strikethrough, Code, Link as LinkIcon, Upload,
  Heading1, Heading2, Quote, List, ListOrdered, Trash2
} from "@/lib/heroicons";
import { entitiesApi, notesApi, vaultApi } from "@/lib/api";
import type { Entity } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { MentionList, type MentionListRef, type MentionItem } from "./MentionList";
import { SlashCommands } from "./SlashCommands";
import { VaultImage } from "./VaultImage";
import { VaultPdf } from "./VaultPdf";
import { VaultAudio } from "./VaultAudio";

const IMAGE_MIME_RE = /^image\//i;
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg)$/i;
const isImageFile = (file: File) => IMAGE_MIME_RE.test(file.type) || IMAGE_EXT_RE.test(file.name);
const PDF_EXT_RE = /\.pdf$/i;
const isPdfFile = (file: File) => file.type === "application/pdf" || PDF_EXT_RE.test(file.name);
const AUDIO_MIME_RE = /^audio\//i;
const AUDIO_EXT_RE = /\.(mp3|m4a|wav|ogg|aac)$/i;
const isAudioFile = (file: File) => AUDIO_MIME_RE.test(file.type) || AUDIO_EXT_RE.test(file.name);

const lowlight = createLowlight(common);

const NoteMention = Mention.extend({
  name: "noteMention",
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: "NOTE",
        parseHTML: (el) => el.getAttribute("data-type") || "NOTE",
        renderHTML: () => ({ "data-type": "NOTE" }),
      },
    };
  },
});

/* ── Caches ── */
const TTL = 4000;
type Cache<T> = { token: string | null; at: number; data: T[]; pending: Promise<T[]> | null };
const entityCache: Cache<Entity> = { token: null, at: 0, data: [], pending: null };
const noteCache: Cache<{ id: string; title: string }> = { token: null, at: 0, data: [], pending: null };

const getToken = () => (typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null);

export const resetEditorCaches = () => {
  Object.assign(entityCache, { token: null, at: 0, data: [], pending: null });
  Object.assign(noteCache, { token: null, at: 0, data: [], pending: null });
};

const loadEntities = async (): Promise<Entity[]> => {
  const token = getToken();
  if (entityCache.token !== token) Object.assign(entityCache, { token, at: 0, data: [], pending: null });
  if (entityCache.pending) return entityCache.pending;
  if (entityCache.data.length && Date.now() - entityCache.at < TTL) return entityCache.data;
  entityCache.pending = entitiesApi.list()
    .then(({ data }) => { entityCache.data = Array.isArray(data) ? data : []; entityCache.at = Date.now(); return entityCache.data; })
    .catch(() => []) .finally(() => { entityCache.pending = null; });
  return entityCache.pending;
};

const loadNotes = async () => {
  const token = getToken();
  if (noteCache.token !== token) Object.assign(noteCache, { token, at: 0, data: [], pending: null });
  if (noteCache.pending) return noteCache.pending;
  if (noteCache.data.length && Date.now() - noteCache.at < TTL) return noteCache.data;
  noteCache.pending = notesApi.list()
    .then(({ data }) => {
      const arr = Array.isArray(data) ? data : [];
      noteCache.data = arr.map((n: any) => ({ id: n.id, title: n.title }));
      noteCache.at = Date.now();
      return noteCache.data;
    })
    .catch(() => []).finally(() => { noteCache.pending = null; });
  return noteCache.pending;
};

/* ── Suggestion factory ── */
const buildSuggestion = (variant: "entity" | "note", currentNoteId?: string) => ({
  char: variant === "entity" ? "@" : "#",
  allowSpaces: variant === "note", 
  startOfLine: false,
  items: async ({ query }: { query: string }): Promise<MentionItem[]> => {
    const q = query.toLowerCase().trim();
    if (variant === "entity") {
      const entities = await loadEntities();
      const matches: MentionItem[] = entities
        .filter((e) => e.title.toLowerCase().includes(q))
        .slice(0, 8)
        .map((e) => ({ id: e.id, title: e.title, type: e.type }));
      if (q && !matches.some((m) => m.title.toLowerCase() === q)) {
        matches.push({ id: `__create__${q}`, title: query, type: "TOPIC", isCreate: true, createKind: "entity" });
      }
      return matches;
    }
    const notes = await loadNotes();
    const matches: MentionItem[] = notes
      .filter((n) => n.id !== currentNoteId && n.title.toLowerCase().includes(q))
      .slice(0, 8)
      .map((n) => ({ id: n.id, title: n.title, type: "NOTE" }));
    if (q && !matches.some((m) => m.title.toLowerCase() === q)) {
      matches.push({ id: `__create__${q}`, title: query, type: "NOTE", isCreate: true, createKind: "note" });
    }
    return matches;
  },
  command: ({ editor, range, props }: any) => {
    const item = props as MentionItem;
    const finalize = (id: string, label: string) => {
      const nodeName = variant === "entity" ? "mention" : "noteMention";
      const attrs = variant === "entity" ? { id, label } : { id, label, type: "NOTE" };
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent([
          { type: nodeName, attrs },
          { type: "text", text: " " },
        ])
        .run();
    };

    if (item.isCreate) {
      const title = item.title.trim();
      if (!title) return;
      if (item.createKind === "entity") {
        const entityType = item.type || "TOPIC"; 
        entitiesApi.create(title, entityType).then((res) => {
          const created = res.data as Entity;
          entityCache.data = [created, ...entityCache.data];
          finalize(created.id, created.title);
        });
        return;
      }
      notesApi.create(title, { type: "doc", content: [{ type: "paragraph" }] }).then((res) => {
        const created = res.data as { id: string; title: string };
        noteCache.data = [{ id: created.id, title: created.title }, ...noteCache.data];
        finalize(created.id, created.title);
      });
      return;
    }

    finalize(item.id, item.title);
  },
  render: () => {
    let component: ReactRenderer<MentionListRef> | null = null;
    let popup: TippyInstance[] | null = null;
    return {
      onStart: (props: SuggestionProps<MentionItem>) => {
        component = new ReactRenderer(MentionList, {
          props: { ...props, query: props.query, variant },
          editor: props.editor,
        });
        if (!props.clientRect) return;
        popup = tippy("body", {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },
      onUpdate(props: SuggestionProps<MentionItem>) {
        component?.updateProps({ ...props, query: props.query, variant });
        if (props.clientRect) popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
      },
      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === "Escape") { popup?.[0]?.hide(); return true; }
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit() { popup?.[0]?.destroy(); component?.destroy(); },
    };
  },
});

/* ── Component API ── */
export interface TiptapEditorHandle {
  getJSON: () => any;
  getHTML: () => string;
  getText: () => string;
  getEditor: () => Editor | null;
  triggerUpload: () => void;
}

interface Props {
  content?: any;
  onChange?: (json: any) => void;
  editable?: boolean;
  className?: string;
  currentNoteId?: string;
}

export const TiptapEditor = forwardRef<TiptapEditorHandle, Props>(
  ({ content, onChange, editable = true, className, currentNoteId }, ref) => {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const navigate = useNavigate();

    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { toast } = useToast();

    const uploadFileRef = useRef<(file: File) => Promise<void>>();

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: false,
          dropcursor: false,
        }),
        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === "heading") return "Heading";
            return "Type / for commands, @ for entities, # to link a note";
          },
          showOnlyWhenEditable: true,
          showOnlyCurrent: false,
        }),
        Typography,
        CharacterCount,
        Dropcursor.configure({ color: "hsl(var(--primary))", width: 2 }),
        LinkExtension.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { class: "text-primary underline underline-offset-4 cursor-pointer" },
        }),
        Image.configure({ HTMLAttributes: { class: "rounded-lg my-4 max-w-full shadow-lg" } }),
        VaultImage,
        VaultPdf,
        VaultAudio,
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        CodeBlockLowlight.configure({ lowlight }),
        Mention.configure({
          HTMLAttributes: { class: "continuum-entity-mention" },
          renderHTML: ({ node, HTMLAttributes }: any) => [
            "span",
            {
              ...HTMLAttributes,
              "data-id": node.attrs.id,
              "data-label": node.attrs.label,
              "data-mention-type": "entity",
            },
            `@${node.attrs.label || node.attrs.id}`,
          ],
          suggestion: buildSuggestion("entity") as any,
        }),
        NoteMention.configure({
          HTMLAttributes: { class: "continuum-note-mention" },
          renderHTML: ({ node, HTMLAttributes }: any) => [
            "span",
            {
              ...HTMLAttributes,
              "data-id": node.attrs.id,
              "data-label": node.attrs.label,
              "data-mention-type": "note",
            },
            `#${node.attrs.label || node.attrs.id}`,
          ],
          suggestion: buildSuggestion("note", currentNoteId) as any,
        }),
        SlashCommands,
      ],
      content: content || { type: "doc", content: [{ type: "paragraph" }] },
      editable,
      editorProps: {
        attributes: {
          class: `continuum-editor prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60vh] ${className || ""}`,
        },
        handleClickOn: (_view, _pos, node, _nodePos, event) => {
          const name = node.type.name;
          if (name !== "mention" && name !== "noteMention") return false;
          const id = (node.attrs as any)?.id;
          if (!id) return false;
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
          event.preventDefault();
          if (name === "noteMention") navigate(`/notes/${id}`);
          else navigate(`/entities/${id}`);
          return true;
        },
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;
          for (const item of items) {
            if (item.type.startsWith("image/") || item.type === "application/pdf" || item.type.startsWith("audio/")) {
              const file = item.getAsFile();
              if (file && uploadFileRef.current) {
                uploadFileRef.current(file);
                return true;
              }
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        onChangeRef.current?.(editor.getJSON());
      },
    });

    const uploadFileToVault = useCallback(async (file: File) => {
      if (!editor) return;
      const formData = new FormData();
      formData.append("file", file);

      setIsUploading(true);
      try {
        const response = await vaultApi.upload(formData);
        const vaultFile = response.data;
        const vaultUrl = `/vault/download/${encodeURIComponent(vaultFile.id)}`;

        if (isImageFile(file)) {
          editor.chain().focus().insertContent([
            { type: "vaultImage", attrs: { vaultId: vaultFile.id, alt: vaultFile.fileName } },
            { type: "paragraph" },
          ]).run();
        } else if (isPdfFile(file)) {
          editor.chain().focus().insertContent([
            { type: "vaultPdf", attrs: { vaultId: vaultFile.id, fileName: vaultFile.fileName } },
            { type: "paragraph" },
          ]).run();
        } else if (isAudioFile(file)) {
          editor.chain().focus().insertContent([
            { type: "vaultAudio", attrs: { vaultId: vaultFile.id, fileName: vaultFile.fileName } },
            { type: "paragraph" },
          ]).run();
        } else {
          editor.chain().focus().insertContent([
            {
              type: "text",
              text: vaultFile.fileName,
              marks: [{ type: "link", attrs: { href: vaultUrl } }],
            },
            { type: "text", text: " " },
          ]).run();
        }

        toast({ title: "File uploaded", description: `${vaultFile.fileName} inserted into your note.` });
      } catch (error: any) {
        if (error?.response?.status === 415) {
          toast({ title: "Unsupported file type", variant: "destructive" });
        } else if (error?.response?.status === 400) {
          toast({ title: "Upload failed", description: "File may exceed your plan vault limit.", variant: "destructive" });
        } else {
          toast({ title: "Upload failed", variant: "destructive" });
        }
      } finally {
        setIsUploading(false);
      }
    }, [editor, toast]);

    useEffect(() => {
      uploadFileRef.current = uploadFileToVault;
    }, [uploadFileToVault]);

    const handleUploadClick = () => {
      fileInputRef.current?.click();
    };

    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        const file = droppedFiles[0];
        await uploadFileToVault(file);
      }
    };

    const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      event.target.value = "";
      await uploadFileToVault(file);
    };

    useImperativeHandle(ref, () => ({
      getJSON: () => editor?.getJSON(),
      getHTML: () => editor?.getHTML() || "",
      getText: () => editor?.getText() || "",
      getEditor: () => editor,
      triggerUpload: () => fileInputRef.current?.click(),
    }));

    useEffect(() => {
      if (!editor || !content) return;
      const a = JSON.stringify(editor.getJSON());
      const b = JSON.stringify(content);
      if (a !== b && typeof content === "object") editor.commands.setContent(content, { emitUpdate: false });
    }, [content, editor]);

    useEffect(() => { if (editor) editor.setEditable(editable); }, [editor, editable]);

    useEffect(() => {
      resetEditorCaches();
      const onFocus = () => resetEditorCaches();
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    }, []);

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,audio/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        {editor && (
          <>
            <BubbleMenu
              editor={editor}
              options={{ placement: "top" }}
              className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl px-1.5 py-1.5"
            >
              <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={Bold} label="Bold" />
              <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={Italic} label="Italic" />
              <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={Strikethrough} label="Strike" />
              <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleCode().run()} active={editor.isActive("code")} icon={Code} label="Code" />
              <div className="w-[1px] h-4 bg-white/10 mx-1" />
              <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} icon={Heading1} label="H1" />
              <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} icon={Heading2} label="H2" />
              <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={Quote} label="Quote" />
              <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={List} label="Bullets" />
              <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={ListOrdered} label="Numbered" />
              <div className="w-[1px] h-4 bg-white/10 mx-1" />
              <ToolbarBtn
                editor={editor}
                action={(e) => {
                  const url = window.prompt("URL", e.getAttributes("link").href || "https://");
                  if (url === null) return;
                  if (url === "") { e.chain().focus().unsetLink().run(); return; }
                  e.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                }}
                active={editor.isActive("link")} icon={LinkIcon} label="Link" />
              <ToolbarBtn
                editor={editor}
                action={() => handleUploadClick()}
                active={false}
                icon={Upload}
                label={isUploading ? "Uploading…" : "Upload file"}
                disabled={isUploading}
              />
            </BubbleMenu>

            {editor.isActive("table") && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-black/95 border border-white/10 px-2 py-1.5 rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 font-medium">Table</span>
                <button type="button" className="text-xs h-7 px-3 rounded hover:bg-white/10 text-neutral-300 transition-colors" onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Col</button>
                <button type="button" className="text-xs h-7 px-3 rounded hover:bg-white/10 text-neutral-300 transition-colors" onClick={() => editor.chain().focus().addRowAfter().run()}>+ Row</button>
                <div className="w-[1px] h-4 bg-white/10 mx-1" />
                <button type="button" className="flex items-center text-xs h-7 px-3 rounded hover:bg-red-500/20 text-red-400 transition-colors" onClick={() => editor.chain().focus().deleteTable().run()}>
                  <Trash2 className="w-3 h-3 mr-1.5" /> Delete
                </button>
              </div>
            )}
          </>
        )}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

            const target = e.target as HTMLElement;

            const mentionTarget = target.closest<HTMLElement>(".continuum-entity-mention, .continuum-note-mention");
            if (mentionTarget) {
              const mentionId = mentionTarget.getAttribute("data-id");
              if (!mentionId) return;
              e.preventDefault();
              if (mentionTarget.classList.contains("continuum-note-mention")) {
                navigate(`/notes/${mentionId}`);
              } else {
                navigate(`/entities/${mentionId}`);
              }
              return;
            }

            const linkTarget = target.closest<HTMLAnchorElement>("a");
            if (linkTarget) {
              const href = linkTarget.getAttribute("href");
              if (!href) return;

              if (href.startsWith("/") || href.startsWith(window.location.origin)) {
                e.preventDefault();
                const path = href.replace(window.location.origin, "");
                navigate(path);
              }
            }
          }}
          className="relative"
        >
          {isDragging && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-xl z-10 flex items-center justify-center pointer-events-none backdrop-blur-[2px]">
              <div className="text-center">
                <Upload className="w-8 h-8 text-primary mx-auto mb-2 animate-bounce" />
                <p className="text-primary font-medium text-sm">Drop files to upload to vault</p>
              </div>
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      </>
    );
  }
);
TiptapEditor.displayName = "TiptapEditor";

function ToolbarBtn({
  editor, action, active, icon: Icon, label, disabled,
}: { editor: Editor; action: (e: Editor) => void; active: boolean; icon: typeof Bold; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) action(editor); }}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors ${
        disabled 
          ? "cursor-not-allowed opacity-40" 
          : active 
            ? "bg-primary/20 text-primary" 
            : "text-neutral-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}