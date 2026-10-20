"use client";

import { useEditorState, type ChainedCommands, type Editor } from "@tiptap/react";
import { useSyncExternalStore, type ReactNode } from "react";
import { BulletListIcon, NumberedListIcon, RedoIcon, UndoIcon } from "./icons";

const INACTIVE = {
  bold: false,
  italic: false,
  underline: false,
  h1: false,
  h2: false,
  bulletList: false,
  orderedList: false,
  canUndo: false,
  canRedo: false,
};

const noSubscription = () => () => {};

// "⌘" on Apple devices, "Ctrl" elsewhere (and during server rendering).
function useModifierKey() {
  return useSyncExternalStore(
    noSubscription,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}

export function EditorToolbar({ editor, disabled }: { editor: Editor | null; disabled: boolean }) {
  const mod = useModifierKey();
  const state =
    useEditorState({
      editor,
      selector: ({ editor: e }) =>
        e && {
          bold: e.isActive("bold"),
          italic: e.isActive("italic"),
          underline: e.isActive("underline"),
          h1: e.isActive("heading", { level: 1 }),
          h2: e.isActive("heading", { level: 2 }),
          bulletList: e.isActive("bulletList"),
          orderedList: e.isActive("orderedList"),
          canUndo: e.can().undo(),
          canRedo: e.can().redo(),
        },
    }) ?? INACTIVE;

  const off = disabled || !editor;
  const run = (command: (chain: ChainedCommands) => ChainedCommands) => {
    if (editor) command(editor.chain().focus()).run();
  };
  const alt = mod === "⌘" ? "⌥" : "Alt";

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 rounded-lg border border-rule bg-paper p-1"
    >
      <ToolButton label="Bold" keys={`${mod}+B`} active={state.bold} disabled={off} onClick={() => run((c) => c.toggleBold())}>
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton label="Italic" keys={`${mod}+I`} active={state.italic} disabled={off} onClick={() => run((c) => c.toggleItalic())}>
        <span className="font-serif italic">I</span>
      </ToolButton>
      <ToolButton label="Underline" keys={`${mod}+U`} active={state.underline} disabled={off} onClick={() => run((c) => c.toggleUnderline())}>
        <span className="underline underline-offset-2">U</span>
      </ToolButton>
      <Divider />
      <ToolButton label="Heading 1" keys={`${mod}+${alt}+1`} active={state.h1} disabled={off} onClick={() => run((c) => c.toggleHeading({ level: 1 }))}>
        <span className="text-[13px] font-semibold">H1</span>
      </ToolButton>
      <ToolButton label="Heading 2" keys={`${mod}+${alt}+2`} active={state.h2} disabled={off} onClick={() => run((c) => c.toggleHeading({ level: 2 }))}>
        <span className="text-[13px] font-semibold">H2</span>
      </ToolButton>
      <Divider />
      <ToolButton label="Bulleted list" keys={`${mod}+Shift+8`} active={state.bulletList} disabled={off} onClick={() => run((c) => c.toggleBulletList())}>
        <BulletListIcon />
      </ToolButton>
      <ToolButton label="Numbered list" keys={`${mod}+Shift+7`} active={state.orderedList} disabled={off} onClick={() => run((c) => c.toggleOrderedList())}>
        <NumberedListIcon />
      </ToolButton>
      <Divider />
      <ToolButton label="Undo" keys={`${mod}+Z`} disabled={off || !state.canUndo} onClick={() => run((c) => c.undo())}>
        <UndoIcon />
      </ToolButton>
      <ToolButton label="Redo" keys={`${mod}+Shift+Z`} disabled={off || !state.canRedo} onClick={() => run((c) => c.redo())}>
        <RedoIcon />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  label,
  keys,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  keys: string;
  active?: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={`${label} (${keys})`}
      disabled={disabled}
      // Keep the selection in the document while clicking.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-35 ${
        active ? "bg-accent-soft text-accent" : "text-ink hover:bg-desk"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-rule" />;
}
