importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js');

let pyodide = null;
let isInitialized = false;

class WorkerStdout {
    constructor() {
        this.buffer = '';
    }

        write(text) {
        this.buffer += text;
        self.postMessage({
            type: 'stdout',
            payload: text
        });
    }
}

async function runPatchCode() {
    const file = await fetch("/assets/python/patchCode.py");
    const patchCode = await file.text();
    await pyodide.runPythonAsync(patchCode);
}

async function getTransformedDebugReadyCode(originalCode) {
    const script = await fetch("/assets/python/transformCodeToDebugReady.py");
    const scriptText = await script.text();
    pyodide.runPython(scriptText);
    return pyodide.runPython(`_transformCodeToDebugReady(${JSON.stringify(originalCode)})`);
}

async function runDebugPrepareCode(breakpoints) {
    const script = await fetch("/assets/python/debugPrepare.py");
    const scriptText = await script.text();
    await pyodide.runPythonAsync(
`
_debugger_state = {
    'breakpoints': ${JSON.stringify(breakpoints)},
    'future': None,
    'step_mode': False,
}
`
    );
    await pyodide.runPythonAsync(scriptText);
}

async function initPyodide() {
    if (isInitialized) return;
    try {
        self.postMessage({type: 'log', payload: 'Pyodide: загрузка...'});
        pyodide = await loadPyodide({});
        await pyodide.loadPackage('requests');
        await pyodide.loadPackage('pandas');
        await pyodide.loadPackage('lxml');
        await pyodide.loadPackage('micropip');
        const stdout = new WorkerStdout();
        pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
# но мы будем использовать свой объект, который вызывает postMessage
        `);
        const jsStdout = {
            write: (text) => stdout.write(text),
            flush: () => {
            },
        };
        pyodide.globals.set('worker_stdout', jsStdout);
        pyodide.runPython(`
import sys
sys.stdout = worker_stdout
        `);

        pyodide.runPythonAsync(`
import micropip
await micropip.install('pyodide-http')
import pyodide_http
pyodide_http.patch_all()  # Патчит все стандартные библиотеки
        `)
        isInitialized = true;
        self.postMessage({type: 'init', payload: 'ok'});
    } catch (e) {
        self.postMessage({type: 'error', payload: e.message});
    }
}

async function handleRunCode(payload, id) {
    try {
        const {code, inputFilenames} = payload;
        const setInputFilenames = new Set(inputFilenames);

        const listAllFiles = pyodide.FS.readdir("/home/pyodide/")
            .filter(filename => name !== "." && name !== ".." && !name.startsWith("__"));

        for (const filename of listAllFiles) {
            if (!setInputFilenames.has(filename)) {
                try {
                    pyodide.FS.unlink(`/home/pyodide/${filename}`);
                } catch (e) {
                    console.log(`Error: unable to delete from pyodide.FS file ${filename}`);
                }
            }
        }

        await runPatchCode();
        const result = await pyodide.runPythonAsync(code);
        console.log("code is done", result);
        self.postMessage({id, type: 'done', payload: result});
    } catch (e) {
        self.postMessage({id, type: 'error', payload: e.message});
    }
}

async function handleLoadFile(filename, byteArray) {
    try {
        const data = new Uint8Array(byteArray);
        pyodide.FS.writeFile(filename, data);
        self.postMessage({type: 'fileLoaded', payload: filename});
    } catch (e) {
        self.postMessage({type: 'error', payload: `Ошибка загрузки файла ${filename}: ${e.message}`});
    }
}

async function handleRemoveFile(filename) {
    try {
        pyodide.FS.unlink(filename);
        self.postMessage({type: 'fileRemoved', payload: filename});
    } catch (e) {
        self.postMessage({type: 'error', payload: `Не удалось удалить ${filename}: ${e.message}`});
    }
}

async function handleSaveResultZip() {
    try {
        const scriptResponse = await fetch('/assets/python/createZipArchiveOfResultFiles.py');
        const script = await scriptResponse.text();
        pyodide.runPython(script);
        const zipData = pyodide.FS.readFile('/home/pyodide/__exported_files.zip');
        self.postMessage({
            type: 'zipReady',
            payload: zipData.buffer,
        }, [zipData.buffer]);
    } catch (e) {
        self.postMessage({type: 'error', payload: `Ошибка создания zip: ${e.message}`});
    }
}

async function handleListOutputFiles(id) {
    try {
        const listFiles = pyodide.FS.readdir("/home/pyodide/")
            .filter(name => name !== "." && name !== ".." && !name.startsWith("__"));
        self.postMessage({id, type: "listOutputFiles", payload: listFiles});
    } catch (e) {
        self.postMessage({id, type: "error", payload: e.message});
    }
}

async function handleReadOutputFile(filename, id) {
    try {
        const content = pyodide.FS.readFile(filename, {encoding: "utf8"});
        self.postMessage({id, type: 'readOutputFile', payload: content});
    } catch (e) {
        self.postMessage({id, type: 'error', payload: e.message});
    }
}

async function handleDebug(payload, id) {
    try {
        const { code, breakpoints, inputFilenames } = payload;

        const setInputFilenames = new Set(inputFilenames);
        const allFiles = pyodide.FS.readdir("/home/pyodide/").filter(name => name !== "." && name !== ".." && !name.startsWith("__"));
        for (const filename of allFiles) {
            if (!setInputFilenames.has(filename)) {
                try { pyodide.FS.unlink(`/home/pyodide/${filename}`); } catch (e) {}
            }
        }

        await runPatchCode();
        const debugReadyCode = await getTransformedDebugReadyCode(code);
        await runDebugPrepareCode(breakpoints);
        console.log("Debug breakpoints:", breakpoints);
        console.log("Debug debugReadyCode:", debugReadyCode);
        await pyodide.runPythonAsync(
`
async def __main__():
${debugReadyCode.split('\n').map(line => '    ' + line).join('\n')}

await __main__()
`
        );
        self.postMessage({ id, type: "debugDone", payload: 'ok' });
    }
    catch (e) {
        self.postMessage({ id, type: "error", payload: e.message });
    }
}

async function handleDebugCommand(cmd) {
    if (cmd === "debugContinue") {
        pyodide.runPython(`
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['step_mode'] = False
    _debugger_state['future'].set_result(None)
`);
    } else if (cmd === "debugStep") {
        pyodide.runPython(`
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['step_mode'] = True
    _debugger_state['future'].set_result(None)
`);
    } else if (cmd === "debugStop") {
        pyodide.runPython(`
if _debugger_state['future'] is not None and not _debugger_state['future'].done():
    _debugger_state['future'].set_exception(asyncio.CancelledError())
`);
    }
}

async function handleReadDebugFile(payload, id) {
    try {
        // Читаем файл с данными отладки
        const content = pyodide.FS.readFile('/home/pyodide/__debug_data.json', { encoding: 'utf8' });
        const data = JSON.parse(content);
        self.postMessage({ id, type: 'debugData', payload: data });
    } catch (e) {
        self.postMessage({ id, type: 'error', payload: e.message });
    }
}

async function handleGetDebugVariables(payload, id) {
    try {
        // Выполняем Python-код для получения переменных и отправляем результат через js.postMessage с id
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

# Отправляем результат обратно с id
js.postMessage({
    'id': ${id},
    'type': 'debugVariables',
    'payload': safe_vars
})
`);
    } catch (e) {
        self.postMessage({ id, type: 'error', payload: e.message });
    }
}

self.addEventListener('message', async (event) => {
    const {id, type, payload} = event.data;

    switch (type) {
        case 'init':
            await initPyodide();
            break;
        case 'run':
            await handleRunCode(payload, id);
            break;
        case 'loadFile':
            await handleLoadFile(payload.filename, payload.data);
            break;
        case 'removeFile':
            await handleRemoveFile(payload);
            break;
        case 'saveZip':
            await handleSaveResultZip();
            break;
        case 'listOutputFiles':
            await handleListOutputFiles(id);
            break;
        case 'readOutputFile':
            await handleReadOutputFile(payload, id);
            break;
        case "debug":
            await handleDebug(payload, id);
            break;
        case "debugCommand":
            await handleDebugCommand(payload);
            break;
        case "getDebugVariables":
            await handleGetDebugVariables(payload, id);
            break;
        case "readDebugFile":
            await handleReadDebugFile(payload, id);
            break;
        default:
            self.postMessage({id, type: 'error', payload: `Неизвестная команда: ${type}`});
    }
});

initPyodide();
