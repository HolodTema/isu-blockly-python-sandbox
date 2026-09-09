import { useCallback, useState } from 'react';
import { Header } from '../widgets/Header/Header';
import { SideConsoleBar } from '../widgets/SideConsoleBar/SideConsoleBar';
import { useCodeRunner } from '../features/CodeRunner/useCodeRunner';
import type { GeneratedCode } from '../shared/ui/BlocklyCanvas';

export function CodeRunnerPage() {
    const { output, isRunning, runCode, stopCode } = useCodeRunner();
    const [code, setCode] = useState<GeneratedCode>({ toLaunch: '', toShow: '' });

    const handleCodeChange = useCallback((generated: GeneratedCode) => {
        setCode(generated);
    }, []);

    return (
        <>
            <Header
                onRun={() => runCode(code.toLaunch)}
                onStop={stopCode}
                isRunning={isRunning}
            />
            <SideConsoleBar
                output={output}
                codeToShow={code.toShow}
                onCodeChange={handleCodeChange}
            />
        </>
    );
}
