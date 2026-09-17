import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import type { PyodideWorkerClient } from "../CodeRunner/PyodideWorkerClient.ts";

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
