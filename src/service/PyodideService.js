export class PyodideService {
    constructor(state) {
        this.state = state;
        this.worker = null;
        this.isReady = false;
        this.pendingPromises = new Map();
        this.messageId = 0;
        this.init();
    }

    init() {
        this.worker = new Worker('src/worker/pyodideWorker.js');

        this.worker.addEventListener('message', (event) => {
            const msg = event.data;
            if (msg.type === 'init') {
                this.isReady = true;
                console.log('Pyodide worker инициализирован');
                return;
            }
            if (msg.type === 'stdout') {
                const currentOutput = this.state.codeOutput || '';
                this.state.setCodeOutput(currentOutput + msg.payload);
                return;
            }
            if (msg.type === 'log') {
                console.log('[Pyodide worker]', msg.payload);
                return;
            }
            if (msg.type === 'error') {
                this.state.setCodeOutput(`Ошибка: ${msg.payload}`);
                return;
            }
            if (msg.type === 'zipReady') {
                const buffer = msg.payload;
                const blob = new Blob([buffer], { type: 'application/zip' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'result_files.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 5000);
                return;
            }
            if (msg.id !== undefined) {
                const resolver = this.pendingPromises.get(msg.id);
                if (resolver) {
                    if (msg.type === 'error') {
                        resolver.reject(new Error(msg.payload));
                    } else {
                        resolver.resolve(msg.payload);
                    }
                    this.pendingPromises.delete(msg.id);
                }
            }
        });

    }

    sendCommand(type, payload) {
        return new Promise((resolve, reject) => {
            const id = this.messageId++;
            this.pendingPromises.set(id, { resolve, reject });
            this.worker.postMessage({ id, type, payload });
        });
    }

    async runPythonCode(code) {
        console.log(code);
        if (!this.isReady) {
            await new Promise(resolve => {
                const check = () => {
                    if (this.isReady) resolve();
                    else setTimeout(check, 100);
                };
                check();
            });
        }
        this.state.setCodeOutput('');
        await this.sendCommand('run', code);
    }

    saveInputFileToPyodideMemory(filename, byteArray) {
        this.worker.postMessage({
            id: this.messageId++,
            type: 'loadFile',
            payload: { filename, data: byteArray.buffer }
        }, [byteArray.buffer]);
    }

    removeInputFileFromPyodideMemory(filename) {
        this.sendCommand('removeFile', filename).catch(e => console.warn(e));
    }

    async saveResultFilesIntoZipArchive() {
        await this.sendCommand('saveZip', null);
        return true;
    }

    runCurrentCodeFromWorkspace() {
        const code = this.state.generatedCode?.trim();
        if (!code) {
            this.state.setCodeOutput('# Пустая программа\n');
            return;
        }
        this.runPythonCode(code);
    }
}