import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
    getMainWorkspace: vi.fn(),
    createStartBlock: vi.fn(),
}));

vi.mock('blockly', () => ({
    getMainWorkspace: mocks.getMainWorkspace,
}));

vi.mock('../../shared/ui/blocklyStartBlock', () => ({
    createStartBlock: mocks.createStartBlock,
}));

import { useNewProject } from './useNewProject';

function createMockWorkspace() {
    return {
        clear: vi.fn(),
        clearUndo: vi.fn(),
    };
}

describe('useNewProject', () => {
    let confirmSpy: ReturnType<typeof vi.spyOn>;
    let workspace: ReturnType<typeof createMockWorkspace>;

    beforeEach(() => {
        vi.clearAllMocks();
        workspace = createMockWorkspace();
        mocks.getMainWorkspace.mockReturnValue(workspace);
        confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    afterEach(() => {
        confirmSpy.mockRestore();
    });

    it('does nothing when user cancels the confirmation dialog', () => {
        confirmSpy.mockReturnValue(false);
        const onCleared = vi.fn();

        const { result } = renderHook(() => useNewProject(onCleared));

        act(() => {
            result.current.createNewProject();
        });

        expect(mocks.getMainWorkspace).not.toHaveBeenCalled();
        expect(workspace.clear).not.toHaveBeenCalled();
        expect(mocks.createStartBlock).not.toHaveBeenCalled();
        expect(workspace.clearUndo).not.toHaveBeenCalled();
        expect(onCleared).not.toHaveBeenCalled();
    });

    it('clears workspace, recreates start block and clears undo-stack when dialog is confirmed', () => {
        const onCleared = vi.fn();

        const { result } = renderHook(() => useNewProject(onCleared));

        act(() => {
            result.current.createNewProject();
        });

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(mocks.getMainWorkspace).toHaveBeenCalledTimes(1);
        expect(workspace.clear).toHaveBeenCalledTimes(1);
        expect(mocks.createStartBlock).toHaveBeenCalledWith(workspace);
        expect(workspace.clearUndo).toHaveBeenCalledTimes(1);
        expect(onCleared).toHaveBeenCalledTimes(1);
    });

    it('calls clear before createStartBlock', () => {
        const callOrder: string[] = [];
        workspace.clear.mockImplementation(() => callOrder.push('clear'));
        workspace.clearUndo.mockImplementation(() => callOrder.push('clearUndo'));
        mocks.createStartBlock.mockImplementation(() => callOrder.push('createStartBlock'));

        const { result } = renderHook(() => useNewProject());

        act(() => {
            result.current.createNewProject();
        });

        expect(callOrder).toEqual(['clear', 'createStartBlock', 'clearUndo']);
    });

    it('works without onCleared callback', () => {
        const { result } = renderHook(() => useNewProject());

        expect(() => {
            act(() => {
                result.current.createNewProject();
            });
        }).not.toThrow();
    });

    it('shows confirmation before editing the workspace', () => {
        const callOrder: string[] = [];
        confirmSpy.mockImplementation(() => {
            callOrder.push('confirm');
            return true;
        });
        workspace.clear.mockImplementation(() => callOrder.push('clear'));

        const { result } = renderHook(() => useNewProject());

        act(() => {
            result.current.createNewProject();
        });

        expect(callOrder).toEqual(['confirm', 'clear']);
    });
});
