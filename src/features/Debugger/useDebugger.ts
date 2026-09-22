import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { PyodideWorkerClient } from "../CodeRunner/PyodideWorkerClient.ts";

/**
 * Hook which manages debug session state: breakpoints, current line and
 * variables snapshot.
 *
 * Uses same worker client as {@link useCodeRunner}, so both hooks should be
 * created in same component (or one should receive `clientRef` from another).
 * This is important because only one debug session can be active at same time.
 *
 * The hook sets debug pause handler on the client. When worker hits breakpoint,
 * handler reads snapshot from worker filesystem and updates hook state. UI can
 * then show current line, variables and switch to debug tab.
 *
 * @param clientRef - Ref to worker client, usually taken from `useCodeRunner`.
 *
 * @returns
 * - `isDebugging` — `true` while debug session is active (including pause).
 * - `isPaused` — `true` when execution is stopped at breakpoint.
 * - `currentLine` — 1-based line number where execution is paused, or `null`.
 * - `variables` — map of variable names to their `repr()` values at pause.
 * - `breakpoints` — sorted list of 1-based line numbers.
 * - `toggleBreakpoint(line)` — adds or removes breakpoint.
 * - `startDebug(code, inputFilenames?, stdinText?)` — starts debug session.
 * - `debugContinue()` — resumes until next breakpoint.
 * - `debugStep()` — moves to next line.
 * - `stopDebug()` — stops debug session from inside.
 */
export function useDebugger(clientRef: RefObject<PyodideWorkerClient | null>) {
    const [isDebugging, setIsDebugging] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentLine, setCurrentLine] = useState<number | null>(null);
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [breakpoints, setBreakpoints] = useState<number[]>([]);

    const breakpointsRef = useRef<number[]>([]);
    useEffect(() => {
        breakpointsRef.current = breakpoints;
    }, [breakpoints]);

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

    const startDebug = useCallback(async (code: string, inputFilenames: string[] = [], stdinText: string = '') => {
        const client = clientRef.current;
        if (!client || !code.trim()) return;

        setIsDebugging(true);
        setIsPaused(false);
        setVariables({});
        setCurrentLine(null);
        try {
            await client.debugCode(code, breakpointsRef.current, inputFilenames, stdinText);
        } catch (e) {
            console.error("Отладка завершилась с ошибкой:", e);
        } finally {
            reset();
        }
    }, [clientRef, reset]);

    const resume = useCallback((command: "continue" | "step") => {
        const client = clientRef.current;
        if (!client) return;
        setIsPaused(false);
        setCurrentLine(null);
        if (command === "continue") {
            client.debugContinue();
        }
        else {
            client.debugStep();
        }
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
