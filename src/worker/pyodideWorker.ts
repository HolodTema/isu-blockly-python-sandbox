import { WorkerMessageType } from "./WorkerMessageType";

declare const self: DedicatedWorkerGlobalScope;

let pyodide: any = null;
let isInitialized: boolean = false;

class WorkerStdout {
    private buffer: string = "";
    write(text: string) {
        this.buffer += text;
        self.postMessage({ type: WorkerMessageType.Stdout, payload: text });
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

async function initPyodide() {
    if (isInitialized) return;
    try {
        self.postMessage({ type: WorkerMessageType.Log, payload: 'Pyodide: загрузка...' });
        const pyodideModule = await import("https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js");
        let loadPyodide = pyodideModule.default;
        if (typeof loadPyodide !== 'function') {
            if (typeof pyodideModule.loadPyodide === 'function') {
                loadPyodide = pyodideModule.loadPyodide;
            } else {
                throw new Error('Не удалось загрузить Pyodide: loadPyodide не является функцией');
            }
        }
        pyodide = await loadPyodide({});
        await pyodide.loadPackage('requests');
        await pyodide.loadPackage('pandas');
        await pyodide.loadPackage('lxml');
        await pyodide.loadPackage('micropip');
        const stdout = new WorkerStdout();
        pyodide.runPython(
`
import sys
from io import StringIO
sys.stdout = StringIO()
`
        );
        const jsStdout = {
            write: (text: string): void => stdout.write(text),
            flush: (): void => {},
        };
        pyodide.globals.set('worker_stdout', jsStdout);
        pyodide.runPython(`import sys; sys.stdout = worker_stdout`);
        await pyodide.runPythonAsync(
`
import micropip
await micropip.install('pyodide-http')
import pyodide_http
pyodide_http.patch_all()
`
        );
        isInitialized = true;
        self.postMessage({ type: WorkerMessageType.Init, payload: "ok" });
    } catch (e: any) {
        self.postMessage({ type: WorkerMessageType.Error, payload: e.message });
    }
}

async function handleRunCode(payload: { code: string; inputFilenames: string[] }, id: number) {
    try {
        const { code, inputFilenames } = payload;
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
        await runPatchCode();
        const result = await pyodide.runPythonAsync(code);
        self.postMessage({ id, type: WorkerMessageType.Done, payload: result });
    } catch (e: any) {
        self.postMessage({ id, type: WorkerMessageType.Error, payload: e.message });
    }
}

async function handleLoadFile(filename: string, byteArray: ArrayBuffer) {
    try {
        const data = new Uint8Array(byteArray);
        pyodide.FS.writeFile(filename, data);
        self.postMessage({ type: WorkerMessageType.FileLoaded, payload: filename });
    } catch (e: any) {
        self.postMessage({ type: WorkerMessageType.Error, payload: `Ошибка загрузки файла ${filename}: ${e.message}` });
    }
}

async function handleRemoveFile(filename: string) {
    try {
        pyodide.FS.unlink(filename);
        self.postMessage({ type: WorkerMessageType.FileRemoved, payload: filename });
    } catch (e: any) {
        self.postMessage({ type: WorkerMessageType.Error, payload: `Не удалось удалить ${filename}: ${e.message}` });
    }
}

async function handleSaveResultZip() {
    try {
        const scriptResponse = await fetch("/assets/python/createZipArchiveOfResultFiles.py");
        const script = await scriptResponse.text();
        pyodide.runPython(script);
        const zipData = pyodide.FS.readFile("/home/pyodide/__exported_files.zip");
        self.postMessage({
            type: WorkerMessageType.ZipReady,
            payload: zipData.buffer,
        }, [zipData.buffer]);
    } catch (e: any) {
        self.postMessage({ type: WorkerMessageType.Error, payload: `Ошибка создания zip: ${e.message}` });
    }
}

async function handleListOutputFiles(id: number) {
    try {
        const listFiles = pyodide.FS.readdir("/home/pyodide/")
            .filter((name: string) => name !== "." && name !== ".." && !name.startsWith("__"));
        self.postMessage({ id, type: WorkerMessageType.ListOutputFiles, payload: listFiles });
    } catch (e: any) {
        self.postMessage({ id, type: WorkerMessageType.Error, payload: e.message });
    }
}

async function handleReadOutputFile(filename: string, id: number) {
    try {
        const content = pyodide.FS.readFile(filename, { encoding: "utf8" });
        self.postMessage({ id, type: WorkerMessageType.ReadOutputFile, payload: content });
    } catch (e: any) {
        self.postMessage({ id, type: WorkerMessageType.Error, payload: e.message });
    }
}

async function handleDebug(payload: { code: string; breakpoints: number[]; inputFilenames: string[] }, id: number) {
    try {
        const { code, breakpoints, inputFilenames } = payload;
        const setInputFilenames = new Set(inputFilenames);
        const allFiles = pyodide.FS.readdir("/home/pyodide/")
            .filter((name: string) => name !== "." && name !== ".." && !name.startsWith("__"));
        for (const filename of allFiles) {
            if (!setInputFilenames.has(filename)) {
                try { pyodide.FS.unlink(`/home/pyodide/${filename}`); } catch (_) {}
            }
        }
        await runPatchCode();
        const debugReadyCode = await getTransformedDebugReadyCode(code);
        await runDebugPrepareCode(breakpoints);
        const finalCode = `
async def __main__():
${debugReadyCode.split('\n').map((line: string) => "    " + line).join("\n")}

await __main__()
`;
        await pyodide.runPythonAsync(finalCode);
        self.postMessage({ id, type: WorkerMessageType.DebugDone, payload: "ok" });
    } catch (e: any) {
        self.postMessage({ id, type: WorkerMessageType.Error, payload: e.message });
    }
}

async function handleDebugCommand(cmd: 'debugContinue' | 'debugStep' | 'debugStop') {
    const commandMap = {
        debugContinue: `
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['step_mode'] = False
    _debugger_state['future'].set_result(None)
`,
        debugStep: `
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['step_mode'] = True
    _debugger_state['future'].set_result(None)
`,
        debugStop: `
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['future'].set_exception(asyncio.CancelledError())
`,
    };
    const pyCommand = commandMap[cmd];
    if (pyCommand) {
        pyodide.runPython(pyCommand);
    }
}

async function handleReadDebugFile(payload: null, id: number) {
    try {
        const content = pyodide.FS.readFile('/home/pyodide/__debug_data.json', { encoding: 'utf8' });
        const data = JSON.parse(content);
        self.postMessage({ id, type: WorkerMessageType.DebugData, payload: data });
    } catch (e: any) {
        self.postMessage({ id, type: WorkerMessageType.Error, payload: e.message });
    }
}

async function handleGetDebugVariables(payload: null, id: number) {
    try {
        pyodide.runPython(`
import sys
import json
import js

frame = _debugger_state.get('frame')
if frame is None:
    raise Exception("No frame available")

locals_ = frame.f_locals
import builtins
builtin_names = dir(builtins)
safe_vars = {}
for k, v in locals_.items():
    if k.startswith('_') or k in builtin_names:
        continue
    try:
        s = repr(v)
        if len(s) > 1000:
            s = s[:1000] + '... (обрезано)'
        safe_vars[str(k)] = s
    except Exception:
        safe_vars[str(k)] = '<непредставимо>'

js.postMessage({
    'id': ${id},
    'type': '${WorkerMessageType.DebugVariables}',
    'payload': safe_vars
})
`);
    } catch (e: any) {
        self.postMessage({ id, type: WorkerMessageType.Error, payload: e.message });
    }
}

self.addEventListener('message', async (event: MessageEvent) => {
    const { id, type, payload } = event.data;

    switch (type) {
        case WorkerMessageType.Init:
            await initPyodide();
            break;
        case WorkerMessageType.Run:
            await handleRunCode(payload, id);
            break;
        case WorkerMessageType.LoadFile:
            await handleLoadFile(payload.filename, payload.data);
            break;
        case WorkerMessageType.RemoveFile:
            await handleRemoveFile(payload);
            break;
        case WorkerMessageType.SaveZip:
            await handleSaveResultZip();
            break;
        case WorkerMessageType.ListOutputFiles:
            await handleListOutputFiles(id);
            break;
        case WorkerMessageType.ReadOutputFile:
            await handleReadOutputFile(payload, id);
            break;
        case WorkerMessageType.Debug:
            await handleDebug(payload, id);
            break;
        case WorkerMessageType.DebugCommand:
            await handleDebugCommand(payload);
            break;
        case WorkerMessageType.GetDebugVariables:
            await handleGetDebugVariables(payload, id);
            break;
        case WorkerMessageType.ReadDebugFile:
            await handleReadDebugFile(payload, id);
            break;
        default:
            self.postMessage({ id, type: WorkerMessageType.Error, payload: `Неизвестная команда: ${type}` });
    }
});

initPyodide();
