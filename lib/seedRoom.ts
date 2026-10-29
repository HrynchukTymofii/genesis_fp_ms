import * as Y from "yjs";
import { BlockNoteEditor, type Block, type PartialBlock } from "@blocknote/core";
import { blocksToYXmlFragment } from "@blocknote/core/yjs";

/** Name of the Yjs fragment that holds a BlockNote document. */
export const FRAGMENT = "blocknote";

/**
 * Copies the DB version into a brand-new room. Built with a fixed Yjs client id,
 * so if two people open the doc at once their identical seeds merge into one copy.
 */
export function seedRoom(doc: Y.Doc, blocks: PartialBlock[]) {
  const seed = new Y.Doc();
  seed.clientID = 1;
  blocksToYXmlFragment(BlockNoteEditor.create(), blocks as Block[], seed.getXmlFragment(FRAGMENT));
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(seed));
  seed.destroy();
}
