import * as Blockly from 'blockly';
import { useCallback } from 'react';
import { createStartBlock } from '../../../shared/ui/blocklyStartBlock';

export function useNewProject(onCleared?: () => void) {
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