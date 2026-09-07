import {loadPyodide} from "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.mjs";
import {WorkerCommand} from "./WorkerCommand";
import {WorkerEvent} from "./WorkerEvent";

let pyodide: any = null;
let isInitComplete: boolean = false;
let currentRunTask: any | null = null;

class WorkerStdout {
    private buffer: string = "";
    write(text: string) {
        this.buffer += text;
        self.postMessage({ type: WorkerEvent.Stdout, payload: text });
    }
}

async function initPyodide(): Promise<void> {
    if (isInitComplete) return;
    try {
        self.postMessage({ type: WorkerEvent.Log, payload: "Pyodide init is in progress" });
        pyodide = await loadPyodide();
        await pyodide.loadPackage("requests");
        await pyodide.loadPackage("pandas");
        await pyodide.loadPackage("lxml");
        await pyodide.loadPackage("micropip");

        const stdout = new WorkerStdout();
        const jsStdout = {
            write: (text: string): void => stdout.write(text),
            flush: (): void => {},
        };
        pyodide.globals.set("_worker_stdout", jsStdout);

        const initScript = await fetch("/assets/python/pyodideInit.py");
        const strInitCode = await initScript.text();
        await pyodide.runPythonAsync(strInitCode);
        isInitComplete = true;
        self.postMessage({ type: WorkerEvent.InitComplete, payload: "ok" });
    } catch (e: any) {
        self.postMessage({ type: WorkerEvent.Error, payload: e.message });
    }
}

async function runPatchCode() {
    const response = await fetch("/assets/python/patchCode.py");
    const code = await response.text();
    await pyodide.runPythonAsync(code);
}

async function getTransformedDebugReadyCode(originalCode: string): Promise<string> {
    const response: Response = await fetch("/assets/python/transformCodeToDebugReady.py");
    const script: string = await response.text();
    pyodide.runPython(script);
    return pyodide.runPython(`_transformCodeToDebugReady(${JSON.stringify(originalCode)})`);
}

async function getTransformedRunReadyCode(originalCode: string): Promise<string> {
    const script = await fetch("/assets/python/transformCodeToRunReady.py");
    const scriptText = await script.text();
    pyodide.runPython(scriptText);
    return pyodide.runPython(
`
_transform_code_to_run_ready(${JSON.stringify(originalCode)})
`
    );
}

async function runDebugPrepareCode(breakpoints: number[]) {
    const response = await fetch("/assets/python/debugPrepare.py");
    const script = await response.text();
    await pyodide.runPythonAsync(`
_debugger_state = {
    'breakpoints': ${JSON.stringify(breakpoints)},
    'future': None,
    'step_mode': False,
}
`);
    await pyodide.runPythonAsync(script);
}

async function handleRunCode(payload: { code: string; inputFilenames: string[] }, id: number) {
    try {
        const { code, inputFilenames } = payload;
        await cleanFilesystemBesidesInputFiles(inputFilenames);
        await runPatchCode();

        const scriptStopRunCodeCheck = await fetch("/assets/python/stopRunCodeCheck.py");
        await pyodide.runPythonAsync(await scriptStopRunCodeCheck.text());

        const runReadyCode = await getTransformedRunReadyCode(code);

        currentRunTask = pyodide.runPythonAsync(
`
async def _main():
${runReadyCode.split("\n").map(line => "    " + line).join("\n")}

await _main()
`
        );
        const result = await currentRunTask;
        self.postMessage({ id, type: WorkerEvent.RunCodeDone, payload: result });
    } catch (e: any) {
        if (e.message && e.message.includes("StopExecution")) {
            self.postMessage({ id, type: WorkerEvent.RunCodeCancelled, payload: "Code running was cancelled by user" });
        } else if (e.message && e.message.includes("CancelledError")) {
            self.postMessage({ id, type: WorkerEvent.RunCodeCancelled, payload: "Code running was cancelled by user" });
        } else {
            self.postMessage({ id, type: WorkerEvent.Error, payload: e.message });
        }
    }
    finally {
        currentRunTask = null;
    }
}

async function handleLoadInputFile(filename: string, byteArray: ArrayBuffer) {
    try {
        const data = new Uint8Array(byteArray);
        pyodide.FS.writeFile(filename, data);
        self.postMessage({ type: WorkerEvent.OnInputFileLoaded, payload: filename });
    } catch (e: any) {
        self.postMessage({ type: WorkerEvent.Error, payload: `Ошибка загрузки файла ${filename}: ${e.message}` });
    }
}

async function handleRemoveInputFile(filename: string) {
    try {
        pyodide.FS.unlink(filename);
        self.postMessage({ type: WorkerEvent.OnInputFileRemoved, payload: filename });
    } catch (e: any) {
        self.postMessage({ type: WorkerEvent.Error, payload: `Не удалось удалить ${filename}: ${e.message}` });
    }
}

async function handleSaveOutputFilesZip() {
    try {
        const scriptResponse = await fetch("/assets/python/createZipArchiveOfResultFiles.py");
        const script = await scriptResponse.text();
        pyodide.runPython(script);
        const zipData = pyodide.FS.readFile("/home/pyodide/__exported_files.zip");
        self.postMessage({
            type: WorkerEvent.OutputFilesZipReady,
            payload: zipData.buffer,
        }, [zipData.buffer]);
    } catch (e: any) {
        self.postMessage({ type: WorkerEvent.Error, payload: `Ошибка создания zip: ${e.message}` });
    }
}

async function handleGetListOutputFiles(id: number) {
    try {
        const listFiles = pyodide.FS.readdir("/home/pyodide/")
            .filter((name: string) => name !== "." && name !== ".." && !name.startsWith("__"));
        self.postMessage({ id, type: WorkerEvent.ListOutputFilesResult, payload: listFiles });
    } catch (e: any) {
        self.postMessage({ id, type: WorkerEvent.Error, payload: e.message });
    }
}

async function handleReadOutputFile(filename: string, id: number) {
    try {
        const content = pyodide.FS.readFile(filename, { encoding: "utf8" });
        self.postMessage({ id, type: WorkerEvent.ReadOutputFileResult, payload: content });
    } catch (e: any) {
        self.postMessage({ id, type: WorkerEvent.Error, payload: e.message });
    }
}

async function handleDebugCode(payload: { code: string; breakpoints: number[]; inputFilenames: string[] }, id: number) {
    try {
        const { code, breakpoints, inputFilenames } = payload;
        await cleanFilesystemBesidesInputFiles(inputFilenames);
        await runPatchCode();
        const debugReadyCode = await getTransformedDebugReadyCode(code);
        await runDebugPrepareCode(breakpoints);
        const finalCode = `
async def __main__():
${debugReadyCode.split('\n').map((line: string) => "    " + line).join("\n")}

await __main__()
`;
        await pyodide.runPythonAsync(finalCode);
        self.postMessage({ id, type: WorkerEvent.DebugCodeDone, payload: "ok" });
    } catch (e: any) {
        self.postMessage({ id, type: WorkerEvent.Error, payload: e.message });
    }
}

async function handleDebugUserCommandContinue() {
    await pyodide.runPythonAsync(
`
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['step_mode'] = False
    _debugger_state['future'].set_result(None)
`
    );
}

async function handleDebugUserCommandStep() {
    await pyodide.runPythonAsync(
`
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['step_mode'] = True
    _debugger_state['future'].set_result(None)
`
    );
}

async function handleDebugUserCommandStop() {
    await pyodide.runPythonAsync(
        `
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['future'].set_exception(asyncio.CancelledError())
`
    );
}

async function handleReadDebugFile(id: number) {
    try {
        const content = pyodide.FS.readFile('/home/pyodide/__debug_data.json', { encoding: 'utf8' });
        const data = JSON.parse(content);
        self.postMessage({ id, type: WorkerEvent.OnDebugFileRead, payload: data });
    } catch (e: any) {
        self.postMessage({ id, type: WorkerEvent.Error, payload: e.message });
    }
}

async function cleanFilesystemBesidesInputFiles(inputFilenames: string[]): Promise<void> {
    const setInputFilenames = new Set(inputFilenames);
    const allFiles = pyodide.FS.readdir("/home/pyodide/")
        .filter((name: string) => name !== "." && name !== ".." && !name.startsWith("__"));
    for (const filename of allFiles) {
        if (!setInputFilenames.has(filename)) {
            try {
                pyodide.FS.unlink(`/home/pyodide/${filename}`);
            } catch (_) {
                // do nothing
            }
        }
    }
}

self.addEventListener('message', async (event: MessageEvent) => {
    const { id, type, payload } = event.data;

    switch (type) {
        case WorkerCommand.Init:
            await initPyodide();
            break;
        case WorkerCommand.StartRunCode:
            await handleRunCode(payload, id);
            break;
        case WorkerCommand.StopRunCode:
            pyodide.runPython("_is_stop_run_code = True");
            if (currentRunTask) {
                pyodide.runPython("if '_current_run_task' in globals() and _current_run_task: _current_run_task.cancel()");
            }
            break;

        case WorkerCommand.StartDebugCode:
            await handleDebugCode(payload, id);
            break;
        case WorkerCommand.DebugUserCommandContinue:
            await handleDebugUserCommandContinue();
            break;
        case WorkerCommand.DebugUserCommandStep:
            await handleDebugUserCommandStep();
            break;
        case WorkerCommand.DebugUserCommandStop:
            await handleDebugUserCommandStop();
            break;
        case WorkerCommand.ReadDebugFile:
            await handleReadDebugFile(id);
            break;

        case WorkerCommand.LoadInputFile:
            await handleLoadInputFile(payload.filename, payload.data);
            break;
        case WorkerCommand.RemoveInputFile:
            await handleRemoveInputFile(payload);
            break;

        case WorkerCommand.SaveOutputFilesZip:
            await handleSaveOutputFilesZip();
            break;
        case WorkerCommand.GetListOutputFiles:
            await handleGetListOutputFiles(id);
            break;
        case WorkerCommand.ReadOutputFile:
            await handleReadOutputFile(payload, id);
            break;

        default:
            self.postMessage({ id, type: WorkerEvent.Error, payload: `Неизвестная команда: ${type}` });
    }
});

initPyodide();
