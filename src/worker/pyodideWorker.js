importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js');

let pyodide = null;
let isInitialized = false;

class WorkerStdout {
    constructor() {
        this.buffer = '';
    }
    write(text) {
        this.buffer += text;
        // Отправляем сразу, но можно накапливать и отправлять по кускам
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
            // можно указать indexURL, если нужно
        });
        await pyodide.loadPackage('requests');
        // Настраиваем перехват вывода
        const stdout = new WorkerStdout();
        pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
# но мы будем использовать свой объект, который вызывает postMessage
        `);
        // Заменим sys.stdout на наш объект (через JavaScript)
        // Для этого создадим Python-объект-обёртку, который вызывает JavaScript-функцию
        const jsStdout = {
            write: (text) => stdout.write(text),
            flush: () => {},
        };
        // Сделаем его доступным в Python как pyodide.worker_stdout
        pyodide.globals.set('worker_stdout', jsStdout);
        pyodide.runPython(`
import sys
sys.stdout = worker_stdout
        `);
        isInitialized = true;
        self.postMessage({ type: 'init', payload: 'ok' });
    } catch (e) {
        self.postMessage({ type: 'error', payload: e.message });
    }
}

async function handleRunCode(code, id) {
    try {
        const result = await pyodide.runPythonAsync(code);
        self.postMessage({ id, type: 'done', payload: result });
    } catch (e) {
        self.postMessage({ id, type: 'error', payload: e.message });
    }
}

async function handleLoadFile(filename, byteArray) {
    try {
        pyodide.FS.writeFile(filename, byteArray);
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
        // файл не существует – игнорируем или сообщаем
        self.postMessage({ type: 'error', payload: `Не удалось удалить ${filename}: ${e.message}` });
    }
}

async function handleSaveResultZip() {
    try {
        // Загружаем скрипт создания zip (можно хранить как строку)
        const scriptResponse = await fetch('/assets/python/createZipArchiveOfResultFiles.py');
        const script = await scriptResponse.text();
        pyodide.runPython(script);
        // Читаем zip
        const zipData = pyodide.FS.readFile('/home/pyodide/exported_files.zip');
        // Передаём ArrayBuffer обратно (используем Transferable для производительности)
        self.postMessage({
            type: 'zipReady',
            payload: zipData.buffer, // передаём ArrayBuffer
        }, [zipData.buffer]); // Transfer ownership
    } catch (e) {
        self.postMessage({ type: 'error', payload: `Ошибка создания zip: ${e.message}` });
    }
}

// Слушаем сообщения от главного потока
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
        default:
            self.postMessage({ id, type: 'error', payload: `Неизвестная команда: ${type}` });
    }
});

// Инициализируем сразу при запуске воркера
initPyodide();