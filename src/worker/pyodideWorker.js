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

function getTransformedDebugReadyCode(originalCode, breakpoints) {
    const transformScript = `
import ast
import asyncio
import sys

class BreakpointInserter(ast.NodeTransformer):
    def __init__(self, breakpoints):
        self.breakpoints = set(breakpoints)
        self.lineno = 0

    def visit(self, node):
        # Вставляем вызов check_breakpoint перед исполняемыми узлами
        if hasattr(node, 'lineno') and node.lineno != self.lineno:
            self.lineno = node.lineno
            # Пропускаем объявления функций, классов, импорты и т.п.
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Import, ast.ImportFrom)):
                # Создаём узел: await check_breakpoint(lineno)
                call = ast.Call(
                    func=ast.Name(id='check_breakpoint', ctx=ast.Load()),
                    args=[ast.Constant(value=node.lineno)],
                    keywords=[]
                )
                await_node = ast.Await(value=call)
                # Возвращаем список из двух узлов: await и исходный узел
                return [await_node, node]
        return self.generic_visit(node)

def transform_code(code, breakpoints):
    tree = ast.parse(code)
    transformer = BreakpointInserter(breakpoints)
    new_tree = transformer.visit(tree)
    ast.fix_missing_locations(new_tree)
    return ast.unparse(new_tree)
`;
    pyodide.runPython(transformScript);
    return pyodide.runPython(`transform_code(${JSON.stringify(originalCode)}, ${JSON.stringify(breakpoints)})`);
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

        console.log(code);
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

        const debugReadyCode = getTransformedDebugReadyCode(code, breakpoints);
        const finalCode = `
async def __main__():
${debugReadyCode.split('\\n').map(line => '    ' + line).join('\\n')}

await __main__()
`;
        await pyodide.runPythonAsync(finalCode);
        self.postMessage({ id, type: "debugDone", payload: 'ok' });
    }
    catch (e) {
        self.postMessage({ id, type: "error", payload: e.message });
    }
}

async function handleDebugCommand(cmd) {
    if (cmd === "debugContinue") {
        pyodide.runPython(`
if debugger_state['future'] is not None and not debugger_state['future'].done():
    debugger_state['step_mode'] = False
    debugger_state['future'].set_result(None)
`);
    } else if (cmd === "debugStep") {
        pyodide.runPython(`
if debugger_state['future'] is not None and not debugger_state['future'].done():
    debugger_state['step_mode'] = True
    debugger_state['future'].set_result(None)
`);
    } else if (cmd === "debugDone") {
        pyodide.runPython(`
if debugger_state['future'] is not None and not debugger_state['future'].done():
    debugger_state['future'].set_exception(asyncio.CancelledError())
`);
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
        default:
            self.postMessage({id, type: 'error', payload: `Неизвестная команда: ${type}`});
    }
});

initPyodide();
