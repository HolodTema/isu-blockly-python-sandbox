import { useCallback, useEffect, useRef, useState } from "react";
import { PyodideWorkerClient } from "./coderApi";
import { downloadBlob } from "../../shared/lib/download";

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

    const runCode = useCallback(async (code: string, inputFilenames: string[] = []) => {
        const client = clientRef.current;
        if (!client) return;

        if (!code.trim()) {
            setOutput("Программа пуста - соберите блоки на холсте");
            return;
        }

        setOutput("");
        setIsRunning(true);
        try {
            await client.runCode(code, inputFilenames);
        } catch (e) {
            setOutput((prev) => prev + `\nОшибка выполнения: ${(e as Error).message}\n`);
        } finally {
            setIsRunning(false);
        }
    }, []);

    const stopCode = useCallback(() => {
        clientRef.current?.stopCode();
    }, []);

    return { output, isReady, isRunning, runCode, stopCode, clientRef };
}
