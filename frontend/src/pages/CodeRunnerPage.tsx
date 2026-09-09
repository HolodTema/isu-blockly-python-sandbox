import { useCallback, useRef, useState } from 'react';
import { Header } from '../widgets/Header/Header';
import { SideConsoleBar } from '../widgets/SideConsoleBar/SideConsoleBar';
import { LoadScreen } from '../widgets/LoadScreen/LoadScreen';
import { useCodeRunner } from '../features/CodeRunner/useCodeRunner';
import { useProjectFiles } from '../features/Files/useProjectFiles';
import { useDebugger } from '../features/Debugger/useDebugger';
import { pickProjectFile, readProjectFile, saveProjectToFile } from '../features/Project/projectFile';
import { useToast } from '../shared/ui/ToastProvider';
import type { BlocklyCanvasHandle, GeneratedCode } from '../shared/ui/BlocklyCanvas';

export function CodeRunnerPage() {
    const toast = useToast();
    const { output, isReady, isRunning, runCode, stopCode, clientRef } = useCodeRunner();
    const files = useProjectFiles(clientRef);
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
        await runCode(code.toLaunch, files.inputFilenames);
        await files.refreshOutputFiles();
    }, [runCode, code.toLaunch, files]);

    const handleDebug = useCallback(async () => {
        if (code.toLaunch.trim().length === 0) {
            toast.showInfo('Еще нет программы для отладки');
            return;
        }
        if (debug.breakpoints.length === 0) {
            toast.showInfo('Поставьте хотя бы одну точку останова (клик возле номера строки)');
            return;
        }
        await debug.startDebug(code.toLaunch, files.inputFilenames);
        await files.refreshOutputFiles();
    }, [debug, code.toLaunch, files, toast]);

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

    return (
        <>
            <LoadScreen isLoading={!isReady} />
            <Header
                onRun={handleRun}
                onStop={stopCode}
                onSaveProject={handleSaveProject}
                onOpenProject={handleOpenProject}
                onToggleCode={() => setIsCodeHidden((prev) => !prev)}
                onDebug={handleDebug}
                isRunning={isRunning}
                isCodeHidden={isCodeHidden}
            />
            <SideConsoleBar
                output={output}
                codeToShow={code.toShow}
                onCodeChange={handleCodeChange}
                onStateChange={handleStateChange}
                blocklyRef={blocklyRef}
                files={files}
                isCodeHidden={isCodeHidden}
                debug={debug}
            />
        </>
    );
}
