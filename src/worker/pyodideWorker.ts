/**
 * Web Worker which runs Python code through Pyodide.
 *
 * Lives in a separate thread to keep main thread responsive: Pyodide is heavy
 * to load and Python code can run for a long time without blocking UI.
 *
 * The worker is created from main thread by `PyodideWorkerClient`. All
 * communication goes through `postMessage` with the protocol described in
 * `WorkerCommand` and `WorkerEvent`.
 *
 * Worker initialises Pyodide on first load, then stays alive and serves
 * multiple run/debug sessions one after another. It does not reset between
 * runs — only filesystem is cleaned before each run.
 */

import {WorkerCommand} from "./WorkerCommand";
import {WorkerEvent} from "./WorkerEvent";

interface PyodideFS {
    readFile(path: string, options: { encoding: "utf8" }): string;
    readFile(path: string): Uint8Array;
    writeFile(path: string, data: Uint8Array): void;
    unlink(path: string): void;
    readdir(path: string): string[];
}

interface PyodideInterface {
    runPython(code: string): unknown;
    runPythonAsync(code: string): Promise<unknown>;
    loadPackage(name: string): Promise<unknown>;
    globals: { set(name: string, value: unknown): void };
    FS: PyodideFS;
}

/** Extracts human-readable message from caught value of unknown shape. */
function getErrorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

let pyodide: PyodideInterface | null = null;
let isInitComplete: boolean = false;
let currentRunTask: Promise<unknown> | null = null;

/** Returns the initialized Pyodide instance. Throws if called before `initPyodide()` resolves. */
function getPyodide(): PyodideInterface {
    if (!pyodide) {
        throw new Error("Pyodide is not initialized yet");
    }
    return pyodide;
}

const STDOUT_FLUSH_INTERVAL_MS = 50;

/**
 * Buffers stdout chunks and flushes them to main thread periodically.
 *
 * Python code often prints one character at a time (for example in a loop),
 * and sending a separate `postMessage` per character would be slow. Instead
 * we accumulate text in a buffer and flush it every 50 ms. This keeps output
 * live-looking while reducing message overhead.
 */
class WorkerStdout {
    private buffer: string = "";
    private flushTimerId: ReturnType<typeof setTimeout> | null = null;

    write(text: string) {
        this.buffer += text;
        if (this.flushTimerId === null) {
            this.flushTimerId = setTimeout(() => this.flush(), STDOUT_FLUSH_INTERVAL_MS);
        }
    }

    flush() {
        if (this.flushTimerId !== null) {
            clearTimeout(this.flushTimerId);
            this.flushTimerId = null;
        }
        if (this.buffer === "") return;
        const payload = this.buffer;
        this.buffer = "";
        self.postMessage({ type: WorkerEvent.Stdout, payload });
    }
}

let workerStdout: WorkerStdout | null = null;

function installStdin(stdinText: string) {
    getPyodide().runPython(
`
import sys, io
sys.stdin = io.StringIO(${JSON.stringify(stdinText)})
`
    );
}

/**
 * Loads Pyodide and installs required packages.
 *
 * Called once on worker start. After success, sends `InitComplete` event so
 * main thread knows it can start sending commands.
 *
 * Packages installed: `requests`, `pandas`, `lxml`, `micropip`. Then
 * `pyodideInit.py` runs, which installs `pyodide-http` and patches `requests`
 * to work in browser environment.
 */
async function initPyodide(): Promise<void> {
    if (isInitComplete) return;
    try {
        self.postMessage({ type: WorkerEvent.Log, payload: "Pyodide init is in progress" });
        const { loadPyodide } = await import("https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.mjs");
        pyodide = (await loadPyodide()) as PyodideInterface;
        await pyodide.loadPackage("requests");
        await pyodide.loadPackage("pandas");
        await pyodide.loadPackage("lxml");
        await pyodide.loadPackage("micropip");

        workerStdout = new WorkerStdout();
        const jsStdout = {
            write: (text: string): void => workerStdout!.write(text),
            flush: (): void => workerStdout!.flush(),
        };
        pyodide.globals.set("_worker_stdout", jsStdout);

        const initScript = await fetch("/assets/python/pyodideInit.py");
        const strInitCode = await initScript.text();
        await pyodide.runPythonAsync(strInitCode);
        isInitComplete = true;
        self.postMessage({ type: WorkerEvent.InitComplete, payload: "ok" });
    } catch (e) {
        self.postMessage({ type: WorkerEvent.Error, payload: getErrorMessage(e) });
    }
}

/**
 * Patches `builtins.input` and `pandas` / `requests` for CORS proxy.
 *
 * Runs before every code execution. Actual patching happens in `patchCode.py`
 * and is guarded by flags inside Python, so repeated calls are cheap.
 */
async function runPatchCode() {
    const response = await fetch("/assets/python/patchCode.py");
    const code = await response.text();
    await getPyodide().runPythonAsync(code);
}

/**
 * Reads `transformCodeToDebugReady.py` and applies it to the given code.
 *
 * The transformation inserts `await _check_breakpoint(N)` before every
 * top-level statement, where N is the 1-based line number.
 */
async function getTransformedDebugReadyCode(originalCode: string): Promise<string> {
    const response: Response = await fetch("/assets/python/transformCodeToDebugReady.py");
    const script: string = await response.text();
    getPyodide().runPython(script);
    return getPyodide().runPython(`_transformCodeToDebugReady(${JSON.stringify(originalCode)})`) as string;
}

/**
 * Reads `transformCodeToRunReady.py` and applies it to the given code.
 *
 * The transformation inserts `await _check_stop_run_code()` before every
 * top-level statement, so user can stop long loops.
 */
async function getTransformedRunReadyCode(originalCode: string): Promise<string> {
    const script = await fetch("/assets/python/transformCodeToRunReady.py");
    const scriptText = await script.text();
    getPyodide().runPython(scriptText);
    return getPyodide().runPython(
`
_transform_code_to_run_ready(${JSON.stringify(originalCode)})
`
    ) as string;
}

/**
 * Prepares debug state in Python: sets breakpoints and defines debug helpers.
 *
 * Runs `debugPrepare.py` which defines `_check_breakpoint` function. This
 * function is later called from transformed code before each top-level
 * statement.
 */
async function runDebugPrepareCode(breakpoints: number[]) {
    const response = await fetch("/assets/python/debugPrepare.py");
    const script = await response.text();
    await getPyodide().runPythonAsync(`
_debugger_state = {
    'breakpoints': ${JSON.stringify(breakpoints)},
    'future': None,
    'step_mode': False,
}
`);
    await getPyodide().runPythonAsync(script);
}

/**
 * Handles `StartRunCode` command: cleans filesystem, patches environment,
 * transforms code and runs it.
 *
 * Sends `RunCodeDone` on success or `RunCodeCancelled` if user stopped
 * execution. Errors are sent as `Error` event.
 */
async function handleRunCode(payload: { code: string; inputFilenames: string[]; stdinText: string }, id: number) {
    try {
        const { code, inputFilenames, stdinText } = payload;
        await cleanFilesystemBesidesInputFiles(inputFilenames);
        await runPatchCode();
        installStdin(stdinText);

        const scriptStopRunCodeCheck = await fetch("/assets/python/stopRunCodeCheck.py");
        await getPyodide().runPythonAsync(await scriptStopRunCodeCheck.text());

        const runReadyCode = await getTransformedRunReadyCode(code);

        currentRunTask = getPyodide().runPythonAsync(
`
async def _main():
${runReadyCode.split("\n").map(line => "    " + line).join("\n")}

await _main()
`
        );
        const result = await currentRunTask;
        workerStdout?.flush();
        self.postMessage({ id, type: WorkerEvent.RunCodeDone, payload: result });
    } catch (e) {
        workerStdout?.flush();
        const message = getErrorMessage(e);
        if (message.includes("StopExecution") || message.includes("CancelledError")) {
            self.postMessage({ id, type: WorkerEvent.RunCodeCancelled, payload: "Code running was cancelled by user" });
        } else {
            self.postMessage({ id, type: WorkerEvent.Error, payload: message });
        }
    }
    finally {
        currentRunTask = null;
    }
}

async function handleLoadInputFile(filename: string, byteArray: ArrayBuffer) {
    try {
        const data = new Uint8Array(byteArray);
        getPyodide().FS.writeFile(filename, data);
        self.postMessage({ type: WorkerEvent.OnInputFileLoaded, payload: filename });
    } catch (e) {
        self.postMessage({ type: WorkerEvent.Error, payload: `Ошибка загрузки файла ${filename}: ${getErrorMessage(e)}` });
    }
}

async function handleRemoveInputFile(filename: string) {
    try {
        getPyodide().FS.unlink(filename);
        self.postMessage({ type: WorkerEvent.OnInputFileRemoved, payload: filename });
    } catch (e) {
        self.postMessage({ type: WorkerEvent.Error, payload: `Не удалось удалить ${filename}: ${getErrorMessage(e)}` });
    }
}

async function handleSaveOutputFilesZip() {
    try {
        const scriptResponse = await fetch("/assets/python/createZipArchiveOfResultFiles.py");
        const script = await scriptResponse.text();
        getPyodide().runPython(script);
        const zipData = getPyodide().FS.readFile("/home/pyodide/__exported_files.zip");
        self.postMessage({
            type: WorkerEvent.OutputFilesZipReady,
            payload: zipData.buffer,
        }, [zipData.buffer]);
    } catch (e) {
        self.postMessage({ type: WorkerEvent.Error, payload: `Ошибка создания zip: ${getErrorMessage(e)}` });
    }
}

async function handleGetListOutputFiles(id: number) {
    try {
        const listFiles = getPyodide().FS.readdir("/home/pyodide/")
            .filter((name: string) => name !== "." && name !== ".." && !name.startsWith("__"));
        self.postMessage({ id, type: WorkerEvent.ListOutputFilesResult, payload: listFiles });
    } catch (e) {
        self.postMessage({ id, type: WorkerEvent.Error, payload: getErrorMessage(e) });
    }
}

async function handleReadOutputFile(filename: string, id: number) {
    try {
        const content = getPyodide().FS.readFile(filename, { encoding: "utf8" });
        self.postMessage({ id, type: WorkerEvent.ReadOutputFileResult, payload: content });
    } catch (e) {
        self.postMessage({ id, type: WorkerEvent.Error, payload: getErrorMessage(e) });
    }
}

/**
 * Handles `StartDebugCode` command: same as `handleRunCode` but uses debug
 * transformation and does not install stop-run check.
 *
 * Debug session ends with `DebugCodeDone` or `DebugCodeCancelled`.
 */
async function handleDebugCode(payload: { code: string; breakpoints: number[]; inputFilenames: string[], stdinText: string }, id: number) {
    console.log("pyodideWorker.handleDebugCode");
    try {
        const { code, breakpoints, inputFilenames, stdinText } = payload;
        await cleanFilesystemBesidesInputFiles(inputFilenames);
        await runPatchCode();
        installStdin(stdinText);
        const debugReadyCode = await getTransformedDebugReadyCode(code);
        await runDebugPrepareCode(breakpoints);
        const finalCode = `
async def __main__():
${debugReadyCode.split('\n').map((line: string) => "    " + line).join("\n")}

await __main__()
`;
        await getPyodide().runPythonAsync(finalCode);
        workerStdout?.flush();
        self.postMessage({ id, type: WorkerEvent.DebugCodeDone, payload: "ok" });
    } catch (e) {
        workerStdout?.flush();
        const message = getErrorMessage(e);
        if (message.includes("CancelledError")) {
            self.postMessage({ id, type: WorkerEvent.DebugCodeCancelled, payload: "debug was cancelled by the user" });
        }
        else {
            self.postMessage({ id, type: WorkerEvent.Error, payload: message });
        }
    }
}

async function handleDebugUserCommandContinue() {
    await getPyodide().runPythonAsync(
`
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['step_mode'] = False
    _debugger_state['future'].set_result(None)
`
    );
}

async function handleDebugUserCommandStep() {
    await getPyodide().runPythonAsync(
`
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['step_mode'] = True
    _debugger_state['future'].set_result(None)
`
    );
}

async function handleDebugUserCommandStop() {
    await getPyodide().runPythonAsync(
        `
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['future'].set_exception(asyncio.CancelledError())
`
    );
}

/**
 * Handles `ReadDebugFile` command: reads `__debug_data.json` from filesystem
 * and returns parsed snapshot.
 *
 * The file is created by `debugPrepare.py` each time execution pauses on a
 * breakpoint.
 */
async function handleReadDebugFile(id: number) {
    try {
        const content = getPyodide().FS.readFile('/home/pyodide/__debug_data.json', { encoding: 'utf8' });
        const data = JSON.parse(content);
        self.postMessage({ id, type: WorkerEvent.OnDebugFileRead, payload: data });
    } catch (e) {
        self.postMessage({ id, type: WorkerEvent.Error, payload: getErrorMessage(e) });
    }
}

/**
 * Removes all files from worker filesystem except input files.
 *
 * Called before each run. Internal files (starting with `__`) are also removed.
 * This gives clean state between runs: old output files do not mix with new
 * ones, and debug snapshots from previous session do not leak.
 */
async function cleanFilesystemBesidesInputFiles(inputFilenames: string[]): Promise<void> {
    const setInputFilenames = new Set(inputFilenames);
    const allFiles = getPyodide().FS.readdir("/home/pyodide/")
        .filter((name: string) => name !== "." && name !== ".." && !name.startsWith("__"));
    for (const filename of allFiles) {
        if (!setInputFilenames.has(filename)) {
            try {
                getPyodide().FS.unlink(`/home/pyodide/${filename}`);
            } catch (_) {
                // do nothing
            }
        }
    }
}

/**
 * Main message handler. Receives `{id, type, payload}` and dispatches to the
 * matching `handle*` function based on `type`.
 *
 * Commands that expect a reply send it back with same `id`. Commands that do
 * not (like stop signals) just execute and return.
 */
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
            if (pyodide) {
                pyodide.runPython("_is_stop_run_code = True");
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

// Start loading Pyodide immediately when worker is created. Main thread will
// wait for `InitComplete` event before sending actual commands.
initPyodide();
