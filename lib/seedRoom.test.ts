import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { yXmlFragmentToBlocks } from "@blocknote/core/yjs";
import { FRAGMENT, seedRoom } from "./seedRoom";

const blocks: PartialBlock[] = [
  { id: "a", type: "heading", content: "Порядок денний" },
  { id: "b", type: "paragraph", content: "Хто що робить" },
];

const texts = (doc: Y.Doc) =>
  yXmlFragmentToBlocks(BlockNoteEditor.create(), doc.getXmlFragment(FRAGMENT)).map((b) =>
    (b.content as { text: string }[]).map((c) => c.text).join(""),
  );

describe("seedRoom", () => {
  it("copies the DB blocks into the room", () => {
    const doc = new Y.Doc();
    seedRoom(doc, blocks);
    expect(texts(doc)).toEqual(["Порядок денний", "Хто що робить"]);
  });

  it("two people seeding the same empty room at once end up with one copy", () => {
    const alice = new Y.Doc();
    const bob = new Y.Doc();
    seedRoom(alice, blocks);
    seedRoom(bob, blocks);
    Y.applyUpdate(alice, Y.encodeStateAsUpdate(bob));
    Y.applyUpdate(bob, Y.encodeStateAsUpdate(alice));
    expect(texts(alice)).toEqual(["Порядок денний", "Хто що робить"]);
    expect(texts(bob)).toEqual(texts(alice));
  });

  it("concurrent edits from two tabs are merged, not overwritten", () => {
    const tab1 = new Y.Doc();
    seedRoom(tab1, blocks);
    const tab2 = new Y.Doc();
    Y.applyUpdate(tab2, Y.encodeStateAsUpdate(tab1));
    // Both tabs type into the same document while out of sync.
    const para = (d: Y.Doc) => d.getXmlFragment(FRAGMENT).createTreeWalker((n) => n instanceof Y.XmlText);
    const t1 = [...para(tab1)][1] as Y.XmlText;
    const t2 = [...para(tab2)][1] as Y.XmlText;
    t1.insert(t1.length, " — Аня");
    t2.insert(0, "1. ");
    Y.applyUpdate(tab1, Y.encodeStateAsUpdate(tab2));
    Y.applyUpdate(tab2, Y.encodeStateAsUpdate(tab1));
    expect(texts(tab1)[1]).toBe("1. Хто що робить — Аня");
    expect(texts(tab2)).toEqual(texts(tab1));
  });
});
