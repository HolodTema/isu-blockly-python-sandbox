import { useCallback, useEffect, useRef, useState } from "react";
import { PyodideWorkerClient } from "./PyodideWorkerClient.ts";
import { downloadBlob } from "../../shared/lib/download";

/**
 * Hook which manages code execution state and gives access to worker client.
 *
 * Creates `PyodideWorkerClient` on mount and disposes it on unmount. Because
 * client lives inside hook, all components which need to talk to worker should
 * get `clientRef` from this hook and pass it down — this way single worker is
 * shared between code runner, debugger and file manager.
 *
 * @returns
 * - `output` — accumulated stdout and error messages from worker.
 * - `isReady` — `true` after Pyodide finished initialization.
 * - `isRunning` — `true` while code is running (not debug).
 * - `runCode(code, inputFilenames?, stdinText?)` — starts execution.
 * - `stopCode()` — sends stop signal to worker.
 * - `clearCodeOutput()` — wipes output without touching worker.
 * - `clientRef` — ref to worker client, should be passed to other hooks.
 *
 * @example
 * ```tsx
 * const { output, runCode, clientRef } = useCodeRunner();
 * const files = useInputOutputFiles(clientRef);
 * ```
 */
export function useCodeRunner() {
    const [output, setOutput] = useState("");
    const [isReady, setIsReady] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const clientRef = useRef<PyodideWorkerClient | null>(null);

    useEffect(() => {
        const client = new PyodideWorkerClient({
            onStdout: (chunk) => setOutput((prev) => prev + chunk),
            onError: (message) => setOutput((prev) => prev + `\n${message}\n`),
            onOutputFilesZip: (data) => {
                downloadBlob(new Blob([data], { type: "application/zip" }), "result_files.zip");
            },
        });
        clientRef.current = client;
        client.whenReady().then(() => setIsReady(true));

        return () => {
            client.dispose();
            clientRef.current = null;
        };
    }, []);

    const runCode = useCallback(async (code: string, inputFilenames: string[] = [], stdinText: string = '') => {
        const client = clientRef.current;
        if (!client) return;

        if (!code.trim()) {
            setOutput("# Пустая программа\n");
            return;
        }

        setOutput("");
        setIsRunning(true);
        try {
            await client.runCode(code, inputFilenames, stdinText);
        } catch (e) {
            setOutput((prev) => prev + `\nОшибка выполнения: ${(e as Error).message}\n`);
        } finally {
            setIsRunning(false);
        }
    }, []);

    const stopCode = useCallback(() => {
        clientRef.current?.stopCode();
    }, []);

    const clearCodeOutput = useCallback(() => {
        setOutput("");
    }, [])

    return { output, isReady, isRunning, runCode, stopCode, clearCodeOutput, clientRef };
}
