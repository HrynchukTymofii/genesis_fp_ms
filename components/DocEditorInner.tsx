"use client";

import "@blocknote/mantine/style.css";
import { useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import type { PartialBlock } from "@blocknote/core";
import { uk } from "@blocknote/core/locales";
import { withCollaboration } from "@blocknote/core/yjs";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { createClient } from "@liveblocks/client";
import { getYjsProviderForRoom, type LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useResolvedTheme } from "@/components/useResolvedTheme";
import { COLLAB_ENABLED, cursorColor } from "@/lib/collab";
import { FRAGMENT, seedRoom } from "@/lib/seedRoom";

export type DocEditorProps = {
  /** BlockNote JSON (array of blocks) or null for an empty document. */
  initialContent: unknown;
  editable?: boolean;
  /** Called 1 s after typing stops; one save at a time per document. */
  onSave?: (doc: unknown) => Promise<void>;
  placeholder?: string;
  /** Liveblocks room for shared editing (see roomId in lib/collab). Without it, the last save wins. */
  room?: string;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type Editor = ReturnType<typeof useCreateBlockNote>;

export default function DocEditorInner(props: DocEditorProps) {
  if (props.room && COLLAB_ENABLED && props.editable !== false) return <SharedDoc {...props} room={props.room} />;
  return <SoloEditor {...props} />;
}

function dictionary(placeholder?: string) {
  return placeholder ? { ...uk, placeholders: { ...uk.placeholders, emptyDocument: placeholder } } : uk;
}

function blocksOf(content: unknown): PartialBlock[] | undefined {
  return Array.isArray(content) && content.length > 0 ? (content as PartialBlock[]) : undefined;
}

function SoloEditor({ initialContent, placeholder, ...rest }: DocEditorProps) {
  const editor = useCreateBlockNote({ initialContent: blocksOf(initialContent), dictionary: dictionary(placeholder) });
  return <EditorView editor={editor} {...rest} />;
}

// ---- Shared editing (Liveblocks + Yjs) ----

let client: ReturnType<typeof createClient> | null = null;
const liveblocks = () => (client ??= createClient({ authEndpoint: "/api/liveblocks-auth" }));

type Session = { provider: LiveblocksYjsProvider; fragment: Y.XmlFragment; user: { name: string; color: string } };

function SharedDoc({ room, ...props }: DocEditorProps & { room: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [failed, setFailed] = useState(false);
  const initial = useRef(props.initialContent);

  useEffect(() => {
    const { room: r, leave } = liveblocks().enterRoom(room);
    const provider = getYjsProviderForRoom(r);
    const doc = provider.getYDoc();
    const fragment = doc.getXmlFragment(FRAGMENT);

    const ready = () => {
      const blocks = blocksOf(initial.current);
      if (fragment.length === 0 && blocks) seedRoom(doc, blocks);
      const self = r.getSelf();
      setSession({
        provider,
        fragment,
        user: { name: (self?.info as { name?: string } | undefined)?.name ?? "Учасник", color: cursorColor(self?.id) },
      });
    };
    const onSync = (synced: boolean) => {
      if (!synced) return;
      provider.off("sync", onSync);
      ready();
    };
    if (provider.synced) ready();
    else provider.on("sync", onSync);
    const offError = r.subscribe("error", () => setFailed(true));

    return () => {
      provider.off("sync", onSync);
      offError();
      leave();
      setSession(null);
    };
  }, [room]);

  if (failed && !session) return <SoloEditor {...props} />;
  if (!session) return <div className="min-h-24 py-1 text-text3">Підключення…</div>;
  return <SharedEditor key={room} session={session} {...props} />;
}

function SharedEditor({ session, placeholder, ...rest }: DocEditorProps & { session: Session }) {
  const editor = useCreateBlockNote(
    withCollaboration({
      dictionary: dictionary(placeholder),
      // Liveblocks ships its own Awareness class; same API as y-protocols.
      collaboration: { provider: session.provider as unknown as { awareness?: Awareness }, fragment: session.fragment, user: session.user },
    }),
    [session],
  );
  return <EditorView editor={editor} shared {...rest} />;
}

// ---- Rendering + autosave to the DB ----

function EditorView({
  editor,
  editable = true,
  onSave,
  shared = false,
}: Pick<DocEditorProps, "editable" | "onSave"> & { editor: Editor; shared?: boolean }) {
  const theme = useResolvedTheme();
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

  const handleChange = (_: unknown, { getChanges }: { getChanges: () => { source: { type: string } }[] }) => {
    if (!onSave) return;
    // In a shared doc the editor that made the change writes the DB copy; others only receive it.
    if (shared && getChanges().every((c) => c.source.type === "yjs-remote")) return;
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
