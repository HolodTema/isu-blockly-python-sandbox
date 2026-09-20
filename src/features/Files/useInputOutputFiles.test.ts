import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { RefObject } from 'react';
import type { PyodideWorkerClient } from '../CodeRunner/PyodideWorkerClient';
import { useInputOutputFiles } from './useInputOutputFiles';

function createMockClient() {
    return {
        isReady: true,
        loadInputFile: vi.fn().mockResolvedValue(undefined),
        removeInputFile: vi.fn(),
        listOutputFiles: vi.fn().mockResolvedValue([] as string[]),
        readOutputFile: vi.fn().mockResolvedValue(''),
        saveOutputFilesZip: vi.fn(),
    };
}

type MockClient = ReturnType<typeof createMockClient>;

function createClientRef(client: MockClient | null): RefObject<PyodideWorkerClient | null> {
    return { current: client } as unknown as RefObject<PyodideWorkerClient | null>;
}

function createFile(name: string, content: string): File {
    return new File([content], name, { type: 'text/plain' });
}

describe('useInputOutputFiles', () => {
    let client: MockClient;

    beforeEach(() => {
        client = createMockClient();
    });

    describe('addInputFile', () => {
        it('adds input file name to state and loads bytes into the client', async () => {
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            await act(async () => {
                await result.current.addInputFile(createFile('data.csv', 'a,b\n1,2'));
            });

            expect(result.current.inputFilenames).toEqual(['data.csv']);
            expect(client.loadInputFile).toHaveBeenCalledTimes(1);

            const [calledName, calledData] = client.loadInputFile.mock.calls[0] as [
                string,
                Uint8Array,
            ];
            expect(calledName).toBe('data.csv');
            expect(calledData).toBeInstanceOf(Uint8Array);
            expect(calledData.byteLength).toBe(7);
        });

        it('does not add a second chip for a duplicate file name', async () => {
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            await act(async () => {
                await result.current.addInputFile(createFile('data.csv', 'first'));
            });
            await act(async () => {
                await result.current.addInputFile(createFile('data.csv', 'second'));
            });

            expect(result.current.inputFilenames).toEqual(['data.csv']);
            // current behaviour: if we put the second input file with the same name, it overwrites the first one
            // now it is ok, and we test such a behaviour
            expect(client.loadInputFile).toHaveBeenCalledTimes(2);
        });

        it('does nothing when client is null', async () => {
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(null)),
            );

            await act(async () => {
                await result.current.addInputFile(createFile('data.csv', 'x'));
            });

            expect(result.current.inputFilenames).toEqual([]);
        });

        it('keeps multiple files in insertion order', async () => {
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            await act(async () => {
                await result.current.addInputFile(createFile('a.csv', ''));
            });
            await act(async () => {
                await result.current.addInputFile(createFile('b.json', ''));
            });
            await act(async () => {
                await result.current.addInputFile(createFile('c.txt', ''));
            });

            expect(result.current.inputFilenames).toEqual(['a.csv', 'b.json', 'c.txt']);
        });
    });

    describe('removeInputFile', () => {
        it('removes file from state and delegates to the client', async () => {
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            await act(async () => {
                await result.current.addInputFile(createFile('data.csv', 'x'));
            });

            act(() => {
                result.current.removeInputFile('data.csv');
            });

            expect(result.current.inputFilenames).toEqual([]);
            expect(client.removeInputFile).toHaveBeenCalledWith('data.csv');
        });

        it('removes only the targeted file', async () => {
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            await act(async () => {
                await result.current.addInputFile(createFile('keep.csv', ''));
            });
            await act(async () => {
                await result.current.addInputFile(createFile('drop.csv', ''));
            });

            act(() => {
                result.current.removeInputFile('drop.csv');
            });

            expect(result.current.inputFilenames).toEqual(['keep.csv']);
        });
    });

    describe('refreshOutputFiles', () => {
        it('lists output files excluding input files', async () => {
            client.listOutputFiles.mockResolvedValue(['data.csv', 'result.csv', 'out.json']);
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            await act(async () => {
                await result.current.addInputFile(createFile('data.csv', ''));
            });
            await act(async () => {
                await result.current.refreshOutputFiles();
            });

            expect(result.current.outputFilenames).toEqual(['result.csv', 'out.json']);
        });

        it('clears previous selection on each refresh', async () => {
            client.listOutputFiles.mockResolvedValue(['out.csv']);
            client.readOutputFile.mockResolvedValue('content');
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            await act(async () => {
                await result.current.refreshOutputFiles();
            });
            await act(async () => {
                await result.current.previewOutputFile('out.csv');
            });

            expect(result.current.selectedOutputFile).toBe('out.csv');
            expect(result.current.selectedOutputFilePreviewText).toBe('content');

            await act(async () => {
                await result.current.refreshOutputFiles();
            });

            expect(result.current.selectedOutputFile).toBeNull();
            expect(result.current.selectedOutputFilePreviewText).toBe('');
        });

        it('does nothing when client is not ready', async () => {
            client.isReady = false;
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            await act(async () => {
                await result.current.refreshOutputFiles();
            });

            expect(client.listOutputFiles).not.toHaveBeenCalled();
            expect(result.current.outputFilenames).toEqual([]);
        });

        it('keeps state unchanged when listOutputFiles rejects', async () => {
            client.listOutputFiles.mockRejectedValue(new Error('worker crashed'));
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            await act(async () => {
                await result.current.refreshOutputFiles();
            });

            expect(result.current.outputFilenames).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe('previewOutputFile', () => {
        it('stores selected filename and file contents', async () => {
            client.readOutputFile.mockResolvedValue('hello, world');
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            await act(async () => {
                await result.current.previewOutputFile('out.csv');
            });

            expect(result.current.selectedOutputFile).toBe('out.csv');
            expect(result.current.selectedOutputFilePreviewText).toBe('hello, world');
            expect(client.readOutputFile).toHaveBeenCalledWith('out.csv');
        });

        it('sets filename before reading, then fills preview text', async () => {
            let resolveRead: (value: string) => void = () => {};
            client.readOutputFile.mockImplementation(
                () => new Promise<string>((resolve) => { resolveRead = resolve; }),
            );

            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            let promise: Promise<void> = Promise.resolve();
            act(() => {
                promise = result.current.previewOutputFile('out.csv');
            });

            // Пока чтение не завершилось — имя файла уже установлено,
            // а текст ещё пустой.
            expect(result.current.selectedOutputFile).toBe('out.csv');
            expect(result.current.selectedOutputFilePreviewText).toBe('');

            await act(async () => {
                resolveRead('late content');
                await promise;
            });

            expect(result.current.selectedOutputFilePreviewText).toBe('late content');
        });

        it('shows error text when readOutputFile rejects', async () => {
            client.readOutputFile.mockRejectedValue(new Error('not found'));
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            await act(async () => {
                await result.current.previewOutputFile('missing.csv');
            });

            expect(result.current.selectedOutputFile).toBe('missing.csv');
            expect(result.current.selectedOutputFilePreviewText).toContain(
                'Не удалось прочитать файл',
            );
            expect(result.current.selectedOutputFilePreviewText).toContain('not found');
        });

        it('does nothing when client is null', async () => {
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(null)),
            );

            await act(async () => {
                await result.current.previewOutputFile('out.csv');
            });

            expect(result.current.selectedOutputFile).toBeNull();
        });
    });

    describe('downloadOutputFilesZip', () => {
        it('delegates to client.saveOutputFilesZip', () => {
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(client)),
            );

            act(() => {
                result.current.downloadOutputFilesZip();
            });

            expect(client.saveOutputFilesZip).toHaveBeenCalledTimes(1);
        });

        it('does not throw when client is null', () => {
            const { result } = renderHook(() =>
                useInputOutputFiles(createClientRef(null)),
            );

            expect(() => result.current.downloadOutputFilesZip()).not.toThrow();
        });
    });
});
