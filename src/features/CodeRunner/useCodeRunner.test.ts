import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
    capturedCallbacks: null as {
        onStdout: (chunk: string) => void;
        onError?: (message: string) => void;
        onOutputFilesZip?: (data: ArrayBuffer) => void;
    } | null,
    runCode: vi.fn(),
    stopCode: vi.fn(),
    dispose: vi.fn(),
    whenReady: vi.fn(),
    downloadBlob: vi.fn(),
}));

vi.mock('./PyodideWorkerClient.ts', () => ({
    PyodideWorkerClient: class {
        constructor(callbacks: unknown) {
            mocks.capturedCallbacks = callbacks as typeof mocks.capturedCallbacks;
        }
        runCode = mocks.runCode;
        stopCode = mocks.stopCode;
        dispose = mocks.dispose;
        whenReady = mocks.whenReady;
    },
}));

vi.mock('../../shared/lib/download', () => ({
    downloadBlob: mocks.downloadBlob,
}));

import { useCodeRunner } from './useCodeRunner';

describe('useCodeRunner', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.capturedCallbacks = null;
        mocks.runCode.mockResolvedValue(undefined);
        mocks.whenReady.mockResolvedValue(undefined);
    });

    describe('initial state', () => {
        it('starts with empty output, isRunning=false and isReady=false', () => {
            const { result } = renderHook(() => useCodeRunner());
            expect(result.current.output).toBe('');
            expect(result.current.isRunning).toBe(false);
            expect(result.current.isReady).toBe(false);
        });

        it('exposes non-null clientRef after mount', () => {
            const { result } = renderHook(() => useCodeRunner());
            expect(result.current.clientRef.current).not.toBeNull();
        });

        it('sets isReady to true after whenReady resolves', async () => {
            const { result } = renderHook(() => useCodeRunner());
            await waitFor(() => expect(result.current.isReady).toBe(true));
        });

        it('disposes client on unmount', () => {
            const { unmount } = renderHook(() => useCodeRunner());
            unmount();
            expect(mocks.dispose).toHaveBeenCalledTimes(1);
        });
    });

    describe('worker callbacks', () => {
        it('appends stdout chunks to existing output', () => {
            const { result } = renderHook(() => useCodeRunner());
            act(() => {
                mocks.capturedCallbacks!.onStdout('chunk 1\n');
                mocks.capturedCallbacks!.onStdout('chunk 2\n');
            });
            expect(result.current.output).toBe('chunk 1\nchunk 2\n');
        });

        it('appends error message wrapped in newlines', () => {
            const { result } = renderHook(() => useCodeRunner());
            act(() => {
                mocks.capturedCallbacks!.onError?.('something failed');
            });
            expect(result.current.output).toBe('\nsomething failed\n');
        });

        it('downloads zip when onOutputFilesZip callback is invoked', () => {
            renderHook(() => useCodeRunner());
            const buffer = new ArrayBuffer(8);
            act(() => {
                mocks.capturedCallbacks!.onOutputFilesZip?.(buffer);
            });
            expect(mocks.downloadBlob).toHaveBeenCalledTimes(1);
            const [blob, filename] = mocks.downloadBlob.mock.calls[0];
            expect(blob).toBeInstanceOf(Blob);
            expect((blob as Blob).type).toBe('application/zip');
            expect(filename).toBe('result_files.zip');
        });
    });

    describe('runCode', () => {
        it('shows empty program message and skips client for empty code', async () => {
            const { result } = renderHook(() => useCodeRunner());
            await act(async () => {
                await result.current.runCode('');
            });
            expect(result.current.output).toBe('# Пустая программа\n');
            expect(mocks.runCode).not.toHaveBeenCalled();
        });

        it('shows empty program message and skips client for whitespace-only code', async () => {
            const { result } = renderHook(() => useCodeRunner());
            await act(async () => {
                await result.current.runCode('   \n\t  ');
            });
            expect(result.current.output).toBe('# Пустая программа\n');
            expect(mocks.runCode).not.toHaveBeenCalled();
        });

        it('clears previous output before running valid code', async () => {
            const { result } = renderHook(() => useCodeRunner());
            act(() => {
                mocks.capturedCallbacks!.onStdout('stale output');
            });
            expect(result.current.output).toBe('stale output');

            await act(async () => {
                await result.current.runCode('print(1)');
            });
            expect(result.current.output).toBe('');
        });

        it('passes code, input filenames and stdin to the client', async () => {
            const { result } = renderHook(() => useCodeRunner());
            await act(async () => {
                await result.current.runCode('print(1)', ['in.csv'], 'stdin text');
            });
            expect(mocks.runCode).toHaveBeenCalledWith(
                'print(1)',
                ['in.csv'],
                'stdin text',
            );
        });

        it('uses empty arrays and string as defaults', async () => {
            const { result } = renderHook(() => useCodeRunner());
            await act(async () => {
                await result.current.runCode('print(1)');
            });
            expect(mocks.runCode).toHaveBeenCalledWith('print(1)', [], '');
        });

        it('sets isRunning to true during call and back to false after', async () => {
            let resolveRunCode: () => void = () => {};
            mocks.runCode.mockImplementation(
                () => new Promise<void>((resolve) => { resolveRunCode = resolve; }),
            );
            const { result } = renderHook(() => useCodeRunner());

            let runPromise: Promise<void>;
            await act(async () => {
                runPromise = result.current.runCode('print(1)');
            });
            expect(result.current.isRunning).toBe(true);

            await act(async () => {
                resolveRunCode();
                await runPromise!;
            });
            expect(result.current.isRunning).toBe(false);
        });

        it('appends error message when client rejects', async () => {
            mocks.runCode.mockRejectedValue(new Error('division by zero'));
            const { result } = renderHook(() => useCodeRunner());
            await act(async () => {
                await result.current.runCode('print(1)');
            });
            expect(result.current.output).toContain('Ошибка выполнения: division by zero');
        });

        it('resets isRunning to false even when client rejects', async () => {
            mocks.runCode.mockRejectedValue(new Error('boom'));
            const { result } = renderHook(() => useCodeRunner());
            await act(async () => {
                await result.current.runCode('print(1)');
            });
            expect(result.current.isRunning).toBe(false);
        });
    });

    describe('stopCode', () => {
        it('delegates to client.stopCode', () => {
            const { result } = renderHook(() => useCodeRunner());
            act(() => {
                result.current.stopCode();
            });
            expect(mocks.stopCode).toHaveBeenCalledTimes(1);
        });
    });

    describe('clearCodeOutput', () => {
        it('wipes output to empty string', () => {
            const { result } = renderHook(() => useCodeRunner());
            act(() => {
                mocks.capturedCallbacks!.onStdout('some output');
            });
            expect(result.current.output).toBe('some output');

            act(() => {
                result.current.clearCodeOutput();
            });
            expect(result.current.output).toBe('');
        });
    });
});
