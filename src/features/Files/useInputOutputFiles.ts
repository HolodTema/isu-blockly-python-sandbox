import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import type { PyodideWorkerClient } from "../CodeRunner/PyodideWorkerClient.ts";

/**
 * Hook which manages input and output files of worker filesystem.
 *
 * Input files are uploaded by user and stay in worker between runs. Output
 * files are produced by Python code and are shown in "Итоговые файлы" tab.
 * The hook keeps track of which files are input, so they are not shown as
 * output by mistake.
 *
 * @param clientRef - Ref to worker client. If `null`, all operations silently
 *   do nothing — this happens before worker is initialized.
 *
 * @returns
 * - `inputFilenames` — names of uploaded input files in insertion order.
 * - `addInputFile(file)` — uploads file, returns result object with `ok` flag.
 * - `removeInputFile(name)` — deletes file from worker and from list.
 * - `outputFilenames` — names of files produced by program, without inputs.
 * - `selectedOutputFile` — name of file which is currently previewed.
 * - `selectedOutputFilePreviewText` — content of selected output file.
 * - `refreshOutputFiles()` — re-reads file list from worker.
 * - `previewOutputFile(name)` — reads file content into preview.
 * - `downloadOutputFilesZip()` — asks worker to pack all output into zip.
 */
export function useInputOutputFiles(clientRef: RefObject<PyodideWorkerClient | null>) {
    const [inputFilenames, setInputFilenames] = useState<string[]>([]);
    const [outputFilenames, setOutputFilenames] = useState<string[]>([]);
    const [selectedOutputFile, setSelectedOutputFile] = useState<string | null>(null);
    const [selectedOutputFilePreviewText, setSelectedOutputFilePreviewText] = useState("");

    const inputFilenamesRef = useRef<Set<string>>(new Set());

    const addInputFile = useCallback(async (file: File) => {
        const client = clientRef.current;
        if (!client) return;

        const data = new Uint8Array(await file.arrayBuffer());
        await client.loadInputFile(file.name, data);

        inputFilenamesRef.current.add(file.name);
        setInputFilenames((prev) => (prev.includes(file.name) ? prev : [...prev, file.name]));
    }, [clientRef]);

    const removeInputFile = useCallback((filename: string) => {
        clientRef.current?.removeInputFile(filename);
        inputFilenamesRef.current.delete(filename);
        setInputFilenames((prev) => prev.filter((name) => name !== filename));
    }, [clientRef]);

    const refreshOutputFiles = useCallback(async () => {
        const client = clientRef.current;
        if (!client || !client.isReady) return;

        try {
            const all = await client.listOutputFiles();
            const produced = all.filter((name) => !inputFilenamesRef.current.has(name));
            setOutputFilenames(produced);
            setSelectedOutputFile(null);
            setSelectedOutputFilePreviewText("");
        } catch (e) {
            console.error("Не удалось получить список итоговых файлов:", e);
        }
    }, [clientRef]);

    const previewOutputFile = useCallback(async (filename: string) => {
        const client = clientRef.current;
        if (!client) return;

        setSelectedOutputFile(filename);
        try {
            setSelectedOutputFilePreviewText(await client.readOutputFile(filename));
        } catch (e) {
            setSelectedOutputFilePreviewText(`Не удалось прочитать файл: ${(e as Error).message}`);
        }
    }, [clientRef]);

    const downloadOutputFilesZip = useCallback(() => {
        clientRef.current?.saveOutputFilesZip();
    }, [clientRef]);

    return {
        inputFilenames,
        addInputFile,
        removeInputFile,
        outputFilenames,
        selectedOutputFile,
        selectedOutputFilePreviewText,
        refreshOutputFiles,
        previewOutputFile,
        downloadOutputFilesZip,
    };
}
