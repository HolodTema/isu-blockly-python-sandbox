import { useCallback, useRef, useState } from 'react';
import { Header } from '../widgets/Header/Header';
import { SideConsoleBar } from '../widgets/SideConsoleBar/SideConsoleBar';
import { useCodeRunner } from '../features/CodeRunner/useCodeRunner';
import { pickProjectFile, readProjectFile, saveProjectToFile } from '../features/Project/projectFile';
import type { BlocklyCanvasHandle, GeneratedCode } from '../shared/ui/BlocklyCanvas';

export function CodeRunnerPage() {
    const { output, isRunning, runCode, stopCode } = useCodeRunner();
    const [code, setCode] = useState<GeneratedCode>({ toLaunch: '', toShow: '' });
    const blocklyRef = useRef<BlocklyCanvasHandle | null>(null);
    const blocklyStateRef = useRef<object>({});

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
            <Header
                onRun={() => runCode(code.toLaunch)}
                onStop={stopCode}
                onSaveProject={handleSaveProject}
                onOpenProject={handleOpenProject}
                isRunning={isRunning}
            />
            <SideConsoleBar
                output={output}
                codeToShow={code.toShow}
                onCodeChange={handleCodeChange}
                onStateChange={handleStateChange}
                blocklyRef={blocklyRef}
            />
        </>
    );
}
