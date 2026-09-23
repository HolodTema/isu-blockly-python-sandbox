import * as Blockly from 'blockly';
import { useCallback } from 'react';
import { createStartBlock } from '../../shared/ui/blocklyStartBlock';

/**
 * Hook which provides "create new project" action.
 *
 * Before clearing workspace, asks user for confirmation via `window.confirm`.
 * This is important because unsaved changes cannot be restored — there is no
 * undo for full workspace reset.
 *
 * After confirmation:
 * 1. clears workspace,
 * 2. creates fresh `start_block`,
 * 3. clears undo history so user cannot accidentally undo back to old project.
 *
 * Order matters: `clear()` before `createStartBlock()`, otherwise new start
 * block would be removed together with old content. And `clearUndo()` after
 * everything else, so it wipes the whole reset as one atomic step.
 *
 * @param onCleared - Optional callback which runs after workspace is reset.
 *   Useful to clear other state (code preview, output, debug variables) which
 *   lives outside of workspace.
 *
 * @returns Object with single `createNewProject()` method.
 *
 * @example
 * ```tsx
 * const { createNewProject } = useNewProject(() => {
 *     setCode({ toLaunch: '', toShow: '' });
 * });
 * ```
 */
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
