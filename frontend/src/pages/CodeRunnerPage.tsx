import { Header } from '../widgets/Header/Header';
import { SideConsoleBar } from '../widgets/SideConsoleBar/SideConsoleBar';
import { useCodeRunner } from '../features/CodeRunner/useCodeRunner';

export function CodeRunnerPage() {
    const { output, isRunning, runCode, stopCode } = useCodeRunner();

    return (
        <>
            <Header
                onRun={() => runCode("print('Hello from Pyodide')")}
                onStop={stopCode}
                isRunning={isRunning}
            />
            <SideConsoleBar output={output} />
        </>
    );
}
