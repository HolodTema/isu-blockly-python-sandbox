import { useCallback, useRef, useState } from 'react';
import { Header } from '../widgets/Header/Header';
import { SideConsoleBar } from '../widgets/SideConsoleBar/SideConsoleBar';
import { LoadScreen } from '../widgets/LoadScreen/LoadScreen';
import { useCodeRunner } from '../features/CodeRunner/useCodeRunner';
import { useInputOutputFiles } from '../features/Files/useInputOutputFiles.ts';
import { useDebugger } from '../features/Debugger/useDebugger';
import { pickProjectFile, readProjectFile, saveProjectToFile } from '../features/Project/projectFile';
import { useToast } from '../shared/ui/ToastProvider';
import type { BlocklyCanvasHandle, GeneratedCode } from '../shared/ui/BlocklyCanvas';

export function CodeRunnerPage() {
    const toast = useToast();
    const { output, isReady, isRunning, runCode, stopCode, clientRef } = useCodeRunner();
    const inputOutputFiles = useInputOutputFiles(clientRef);
    const debug = useDebugger(clientRef);
    const [code, setCode] = useState<GeneratedCode>({ toLaunch: '', toShow: '' });
    const blocklyRef = useRef<BlocklyCanvasHandle | null>(null);
    const blocklyStateRef = useRef<object>({});
    const [isCodeHidden, setIsCodeHidden] = useState(false);

    const handleCodeChange = useCallback((generated: GeneratedCode) => {
        setCode(generated);
    }, []);

    const handleStateChange = useCallback((state: object) => {
        blocklyStateRef.current = state;
    }, []);

    const handleSaveProject = useCallback(() => {
        saveProjectToFile({
            python: code.toShow,
            blocklyState: blocklyStateRef.current as Record<string, unknown>,
        });
    }, [code.toShow]);

    // Программа могла создать файлы, поэтому список обновляем сразу после
    // завершения запуска - иначе он обновится только при смене вкладки.
    const handleRun = useCallback(async () => {
        await runCode(code.toLaunch, inputOutputFiles.inputFilenames);
        await inputOutputFiles.refreshOutputFiles();
    }, [runCode, code.toLaunch, inputOutputFiles]);

    const handleDebug = useCallback(async () => {
        if (code.toLaunch.trim().length === 0) {
            toast.showInfo('Еще нет программы для отладки');
            return;
        }
        if (debug.breakpoints.length === 0) {
            toast.showInfo('Поставьте хотя бы одну точку останова (клик возле номера строки)');
            return;
        }
        await debug.startDebug(code.toLaunch, inputOutputFiles.inputFilenames);
        await inputOutputFiles.refreshOutputFiles();
    }, [debug, code.toLaunch, inputOutputFiles, toast]);

    const handleOpenProject = useCallback(async () => {
        const file = await pickProjectFile();
        if (!file) return;

        try {
            const project = await readProjectFile(file);
            blocklyRef.current?.loadState(project.blocklyState);
        } catch (e) {
            console.error('Не удалось открыть проект:', e);
        }
    }, []);

    const handleStopExecution = useCallback(() => {
        if (debug.isDebugging) {
            debug.stopDebug();
        }
        else {
            stopCode();
        }
    }, [debug.isDebugging, debug.stopDebug, stopCode]);

    return (
        <>
            <LoadScreen isLoading={!isReady} />
            <Header
                onRunCode={handleRun}
                onStopExecution={handleStopExecution}
                onSaveProject={handleSaveProject}
                onOpenProject={handleOpenProject}
                onToggleCode={() => setIsCodeHidden((prev) => !prev)}
                onDebugCode={handleDebug}
                isRunning={isRunning}
                isDebugging={debug.isDebugging}
                isCodeHidden={isCodeHidden}
            />
            <SideConsoleBar
                output={output}
                codeToShow={code.toShow}
                onCodeChange={handleCodeChange}
                onStateChange={handleStateChange}
                blocklyRef={blocklyRef}
                inputOutputFiles={inputOutputFiles}
                isCodeHidden={isCodeHidden}
                debug={debug}
            />
        </>
    );
}
