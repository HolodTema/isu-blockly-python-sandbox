import * as Blockly from 'blockly';

/**
 * Creates Blockly block with type `start_block` on given workspace and marks it non-deletable
 * and non-movable.
 *
 * Called automatically on mount and after project loading. External
 * code can recreate block after workspace is cleared. See {@link useNewProject}.
 */
export function createStartBlock(ws: Blockly.WorkspaceSvg): void {
  const startBlock = ws.newBlock('start_block');
  startBlock.initSvg();
  startBlock.render();
  startBlock.moveBy(50, 30);
  startBlock.setDeletable(false);
  startBlock.setMovable(false);
}
