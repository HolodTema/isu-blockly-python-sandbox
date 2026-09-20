import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readProjectFile, saveProjectToFile } from './projectFile';

vi.mock('../../shared/lib/download', () => ({
    downloadBlob: vi.fn(),
}));

import { downloadBlob } from '../../shared/lib/download';
const mockedDownloadBlob = vi.mocked(downloadBlob);

describe('readProjectFile', () => {
    it('parses a valid project file', async () => {
        const payload = {
            python: "print('hello')",
            blocklyState: { blocks: { blocks: [] } },
        };
        const file = new Blob([JSON.stringify(payload)]);

        const result = await readProjectFile(file);

        expect(result.python).toBe("print('hello')");
        expect(result.blocklyState).toEqual({ blocks: { blocks: [] } });
    });

    it('throws on invalid JSON', async () => {
        const file = new Blob(['{ this is not valid json']);

        await expect(readProjectFile(file)).rejects.toThrow();
    });

    it('throws when python field is missing', async () => {
        const payload = { blocklyState: { blocks: { blocks: [] } } };
        const file = new Blob([JSON.stringify(payload)]);

        await expect(readProjectFile(file)).rejects.toThrow('Неверный формат файла проекта');
    });

    it('throws when python field is not a string', async () => {
        const payload = { python: 42, blocklyState: { blocks: { blocks: [] } } };
        const file = new Blob([JSON.stringify(payload)]);

        await expect(readProjectFile(file)).rejects.toThrow('Неверный формат файла проекта');
    });

    it('throws when blocklyState field is missing', async () => {
        const payload = { python: "print('hello')" };
        const file = new Blob([JSON.stringify(payload)]);

        await expect(readProjectFile(file)).rejects.toThrow('Неверный формат файла проекта');
    });

    it('throws when blocklyState is null', async () => {
        const payload = { python: "print('hello')", blocklyState: null };
        const file = new Blob([JSON.stringify(payload)]);

        await expect(readProjectFile(file)).rejects.toThrow('Неверный формат файла проекта');
    });

    it('preserves nested blocklyState structure as-is', async () => {
        const nestedState = {
            blocks: {
                languageVersion: 0,
                blocks: [
                    { type: 'start_block', x: 50, y: 30 },
                    { type: 'print_block', x: 200, y: 30 },
                ],
            },
        };
        const file = new Blob([
            JSON.stringify({ python: 'print("x")', blocklyState: nestedState }),
        ]);

        const result = await readProjectFile(file);

        expect(result.blocklyState).toEqual(nestedState);
    });
});

describe('saveProjectToFile', () => {
    beforeEach(() => {
        mockedDownloadBlob.mockClear();
    });

    it('saves project with default filename', async () => {
        const project = {
            python: "print('hello')",
            blocklyState: { blocks: { blocks: [] } },
        };

        saveProjectToFile(project);

        expect(mockedDownloadBlob).toHaveBeenCalledTimes(1);
        const [blob, filename] = mockedDownloadBlob.mock.calls[0];
        expect(filename).toBe('project.chef');
        expect(JSON.parse(await (blob as Blob).text())).toEqual(project);
    });

    it('saves project with a custom filename', async () => {
        const project = {
            python: '',
            blocklyState: {},
        };

        saveProjectToFile(project, 'my-project.chef');

        expect(mockedDownloadBlob).toHaveBeenCalledTimes(1);
        const [, filename] = mockedDownloadBlob.mock.calls[0];
        expect(filename).toBe('my-project.chef');
    });

    it('serializes project to JSON inside the Blob', async () => {
        const project = {
            python: 'a = 1\nb = 2',
            blocklyState: { blocks: { blocks: [{ type: 'start_block' }] } },
        };

        saveProjectToFile(project, 'test.chef');

        const [blob] = mockedDownloadBlob.mock.calls[0];
        const text = await (blob as Blob).text();
        expect(JSON.parse(text)).toEqual({
            python: 'a = 1\nb = 2',
            blocklyState: { blocks: { blocks: [{ type: 'start_block' }] } },
        });
    });

    it('round-trips with readProjectFile', async () => {
        const original = {
            python: "print('roundtrip')",
            blocklyState: { blocks: { blocks: [{ type: 'start_block' }] } },
        };

        saveProjectToFile(original, 'roundtrip.chef');
        const [savedBlob] = mockedDownloadBlob.mock.calls[0];

        const restored = await readProjectFile(savedBlob as Blob);

        expect(restored).toEqual(original);
    });
});
