"use client";

import "@blocknote/mantine/style.css";
import { useEffect, useRef, useState } from "react";
import type { PartialBlock } from "@blocknote/core";
import { uk } from "@blocknote/core/locales";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useResolvedTheme } from "@/components/useResolvedTheme";

export type DocEditorProps = {
  /** BlockNote JSON (array of blocks) or null for an empty document. */
  initialContent: unknown;
  editable?: boolean;
  /** Called 1 s after typing stops; one save at a time per document. */
  onSave?: (doc: unknown) => Promise<void>;
  placeholder?: string;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export default function DocEditorInner({ initialContent, editable = true, onSave, placeholder }: DocEditorProps) {
  const theme = useResolvedTheme();
  const editor = useCreateBlockNote({
    initialContent:
      Array.isArray(initialContent) && initialContent.length > 0
        ? (initialContent as PartialBlock[])
        : undefined,
    dictionary: placeholder
      ? { ...uk, placeholders: { ...uk.placeholders, emptyDocument: placeholder } }
      : uk,
  });

  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const pending = useRef(false);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const flush = async () => {
    if (!onSaveRef.current) return;
    if (inFlight.current) {
      pending.current = true; // save again once the current write finishes
      return;
    }
    setState("saving");
    const run = onSaveRef.current(editor.document)
      .then(() => setState(pending.current ? "saving" : "saved"))
      .catch(() => setState("error"));
    inFlight.current = run;
    await run;
    inFlight.current = null;
    if (pending.current) {
      pending.current = false;
      await flush();
    }
  };

  const handleChange = () => {
    if (!onSave) return;
    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1000);
  };

  // Save pending changes if the editor unmounts (e.g. closing the side panel).
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void onSaveRef.current?.(editor.document);
      }
    },
    [editor],
  );

  return (
    <div className="doc-editor relative -ml-[40px] max-sm:-ml-6">
      <BlockNoteView editor={editor} editable={editable} theme={theme} onChange={handleChange} />
      {onSave && editable && (
        <div aria-live="polite" className="pointer-events-none absolute -top-6 right-0 text-xs text-text3">
          {state === "dirty" || state === "saving"
            ? "Збереження…"
            : state === "saved"
              ? "Збережено"
              : state === "error"
                ? <span className="text-danger">Не вдалося зберегти</span>
                : null}
        </div>
      )}
    </div>
  );
}
