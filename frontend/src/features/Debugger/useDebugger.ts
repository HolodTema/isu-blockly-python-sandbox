import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { PyodideWorkerClient } from "../CodeRunner/coderApi";

export function useDebugger(clientRef: RefObject<PyodideWorkerClient | null>) {
    const [isDebugging, setIsDebugging] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentLine, setCurrentLine] = useState<number | null>(null);
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [breakpoints, setBreakpoints] = useState<number[]>([]);

    const breakpointsRef = useRef<number[]>([]);
    breakpointsRef.current = breakpoints;

    useEffect(() => {
        clientRef.current?.setDebugPausedHandler(async () => {
            const client = clientRef.current;
            if (!client) return;
            try {
                const snapshot = await client.readDebugSnapshot();
                setCurrentLine(snapshot.line);
                setVariables(snapshot.variables ?? {});
                setIsPaused(true);
            } catch (e) {
                console.error("Не удалось прочитать состояние отладки:", e);
            }
        });
    }, [clientRef]);

    const toggleBreakpoint = useCallback((line: number) => {
        setBreakpoints((prev) =>
            prev.includes(line) ? prev.filter((n) => n !== line) : [...prev, line]
        );
    }, []);

    const reset = useCallback(() => {
        setIsDebugging(false);
        setIsPaused(false);
        setCurrentLine(null);
        setVariables({});
    }, []);

    const startDebug = useCallback(async (code: string, inputFilenames: string[] = []) => {
        const client = clientRef.current;
        if (!client || !code.trim()) return;

        setIsDebugging(true);
        setIsPaused(false);
        setVariables({});
        setCurrentLine(null);
        try {
            await client.debugCode(code, breakpointsRef.current, inputFilenames);
        } catch (e) {
            console.error("Отладка завершилась с ошибкой:", e);
        } finally {
            reset();
        }
    }, [clientRef, reset]);

    // После продолжения и шага выполнение снова идёт, значит пауза снимается
    // до следующего сигнала от воркера.
    const resume = useCallback((command: "continue" | "step") => {
        const client = clientRef.current;
        if (!client) return;
        setIsPaused(false);
        setCurrentLine(null);
        if (command === "continue") client.debugContinue();
        else client.debugStep();
    }, [clientRef]);

    const stopDebug = useCallback(() => {
        clientRef.current?.debugStop();
        reset();
    }, [clientRef, reset]);

    return {
        isDebugging,
        isPaused,
        currentLine,
        variables,
        breakpoints,
        toggleBreakpoint,
        startDebug,
        debugContinue: () => resume("continue"),
        debugStep: () => resume("step"),
        stopDebug,
    };
}
