import * as Blockly from 'blockly';
import { useCallback, type RefObject } from 'react';
import { createStartBlock, type BlocklyCanvasHandle } from '../../../shared/ui/BlocklyCanvas';

export function useNewProject(blocklyRef: RefObject<BlocklyCanvasHandle | null>, onCleared?: () => void) {
    const createNewProject = useCallback(() => {
        if (!window.confirm('Вы уверены, что хотите создать новый проект? Все несохранённые изменения будут потеряны.')) {
            return;
        }

        const workspace = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;

        workspace.clear();
        createStartBlock(workspace); 
        workspace.clearUndo();       

        onCleared?.();
    }, [onCleared]);

    return { createNewProject };
}