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

async function initPyodide() {
    if (isInitialized) return;
    try {
        self.postMessage({ type: 'log', payload: 'Pyodide: загрузка...' });
        pyodide = await loadPyodide({
        });
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
            flush: () => {},
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
        self.postMessage({ type: 'init', payload: 'ok' });
    } catch (e) {
        self.postMessage({ type: 'error', payload: e.message });
    }
}

async function handleRunCode(code, id) {
    try {
        console.log(code);
        const result = await pyodide.runPythonAsync(code);
        console.log("code is done", result);
        self.postMessage({ id, type: 'done', payload: result });
    } catch (e) {
        self.postMessage({ id, type: 'error', payload: e.message });
    }
}

async function handleLoadFile(filename, byteArray) {
    try {
        const data = new Uint8Array(byteArray);
        pyodide.FS.writeFile(filename, data);
        self.postMessage({ type: 'fileLoaded', payload: filename });
    } catch (e) {
        self.postMessage({ type: 'error', payload: `Ошибка загрузки файла ${filename}: ${e.message}` });
    }
}

async function handleRemoveFile(filename) {
    try {
        pyodide.FS.unlink(filename);
        self.postMessage({ type: 'fileRemoved', payload: filename });
    } catch (e) {
        self.postMessage({ type: 'error', payload: `Не удалось удалить ${filename}: ${e.message}` });
    }
}

async function handleSaveResultZip() {
    try {
        const scriptResponse = await fetch('/assets/python/createZipArchiveOfResultFiles.py');
        const script = await scriptResponse.text();
        pyodide.runPython(script);
        const zipData = pyodide.FS.readFile('/home/pyodide/exported_files.zip');
        self.postMessage({
            type: 'zipReady',
            payload: zipData.buffer,
        }, [zipData.buffer]);
    } catch (e) {
        self.postMessage({ type: 'error', payload: `Ошибка создания zip: ${e.message}` });
    }
}

async function handleListOutputFiles(id) {
    try {
        const listFiles = pyodide.FS.readdir("/home/pyodide/")
            .filter(name => name !== "." && name !== ".." && !name.startsWith("__"));
        self.postMessage({ id, type: "listOutputFiles", payload: listFiles });
    } catch (e) {
        self.postMessage({ id, type: "error", payload: e.message });
    }
}

async function handleReadOutputFile(filename, id) {
    try {
        const content = pyodide.FS.readFile(filename, { encoding: "utf8" });
        self.postMessage({ id, type: 'readOutputFile', payload: content });
    } catch (e) {
        self.postMessage({ id, type: 'error', payload: e.message });
    }
}

self.addEventListener('message', async (event) => {
    const { id, type, payload } = event.data;

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
        default:
            self.postMessage({ id, type: 'error', payload: `Неизвестная команда: ${type}` });
    }
});

initPyodide();
