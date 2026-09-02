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
def transform_code(code, breakpoints):
    lines = code.split('\\n')
    new_lines = []
    func_stack = []  # стек отступов всех функций (def и async def)
    block_keywords = ('if ', 'elif ', 'else:', 'for ', 'while ', 'try:', 'except', 'finally:', 'with ', 'class ', 'import ', 'from ')
    
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped == '' or stripped.startswith('#'):
            new_lines.append(line)
            continue
        
        indent = line[:len(line) - len(line.lstrip())]
        indent_len = len(indent)
        
        # Проверяем выход из функций: если текущий отступ <= отступа вершины стека, выходим
        while func_stack and indent_len <= func_stack[-1]:
            func_stack.pop()
        
        # Проверяем, не начинается ли строка с определения функции (def или async def)
        if stripped.startswith('def ') or stripped.startswith('async def '):
            func_stack.append(indent_len)
            new_lines.append(line)
            continue
        
        # Если мы внутри любой функции (стек не пуст), просто копируем строку
        if func_stack:
            new_lines.append(line)
            continue
        
        # Если мы не внутри функции
        # Пропускаем строки, начинающиеся с ключевых слов блоков
        if any(stripped.startswith(kw) for kw in block_keywords):
            new_lines.append(line)
            continue
        # Все остальные строки – исполняемые на глобальном уровне, вставляем await
        new_lines.append(f"{indent}await check_breakpoint({i})")
        new_lines.append(line)
    
    return '\\n'.join(new_lines)
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
import asyncio
import sys

debugger_state = {
    'breakpoints': ${JSON.stringify(breakpoints)},
    'future': None,
    'step_mode': False,
}

async def check_breakpoint(lineno):
    if lineno in debugger_state['breakpoints'] or debugger_state['step_mode']:
        frame = sys._getframe(1)
        locals_ = frame.f_locals
        globals_ = frame.f_globals
        variables = {**locals_, **globals_}
        import js
        js.postMessage({
            'type': 'breakpoint',
            'payload': {
                'line': lineno,
                'variables': {k: repr(v) for k, v in variables.items()}
            }
        })
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        debugger_state['future'] = future
        await future
        debugger_state['step_mode'] = False
    return None

async def __main__():
${debugReadyCode.split('\n').map(line => '    ' + line).join('\n')}

await __main__()
`;

        console.log("Debug breakpoints:", breakpoints);
        console.log("Debug finalCode:", finalCode);
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
    } else if (cmd === "debugStop") {
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
