import {AppState} from "../state/AppState";

export class PyodideService {
    private worker: Worker = new Worker(
        new URL("../worker/pyodideWorker.js", import.meta.url)
    );
    private isReady: boolean = false;
    private mapPendingPromises: Map<number, {resolve: Function; reject: Function}> = new Map();
    private messageId: number = 0;

    constructor(private state: AppState) {
        this.worker.addEventListener("message", (event: MessageEvent<any>) => {
            const msg = event.data;
            if (msg.type === "init") {
                this.isReady = true;
                console.log("Pyodide worker: init complete");
                return;
            }
            if (msg.type === "stdout") {
                const currentCodeOutput = this.state.getStrCodeOutput();
                this.state.setStrCodeOutput(currentCodeOutput + msg.payload);
                return;
            }
            if (msg.type === "log") {
                console.log("Pyodide worker:", msg.payload);
                return;
            }
            if (msg.type === "error") {
                this.state.setStrCodeOutput(`Error: ${msg.payload}`);
                return;
            }
            if (msg.type === "zipReady") {
                const blob: Blob = new Blob([msg.payload], {type: "application/zip"});
                const url: string = URL.createObjectURL(blob);
                const a: HTMLAnchorElement = document.createElement("a");
                a.href = url;
                a.download = "result_files.zip";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            }
            if (msg.id !== undefined) {
                const resolver: {resolve: Function, reject: Function}|undefined = this.mapPendingPromises.get(msg.id);
                if (resolver) {
                    if (msg.type === "error") {
                        resolver.reject(new Error(msg.payload));
                    } else {
                        resolver.resolve(msg.payload);
                    }
                    this.mapPendingPromises.delete(msg.id);
                }
            }
        });
    }

    sendCommand(type: string, payload: any): Promise<any> {
        return new Promise((resolve: Function, reject: Function) => {
            const id: number = this.messageId++;
            this.mapPendingPromises.set(id, {resolve, reject});
            this.worker.postMessage({id, type, payload});
        });
    }

    async runPythonCode(code: string): Promise<void> {
        if (!this.isReady) {
            await new Promise((resolve: Function) => {
                const check = () => {
                    if (this.isReady) {
                        resolve();
                    }
                    else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        }
        this.state.setStrCodeOutput("");
        try {
            await this.sendCommand("run", code);
        }
        catch (error: any) {
            this.state.setStrCodeOutput(`Runtime error: ${error.message}`);
            console.error("Pyodide error:", error);
        }
    }

    saveInputFileToPyodideMemory(filename: string, byteArray: Uint8Array) {
        this.worker.postMessage({
            id: this.messageId++,
            type: "loadFile",
            payload: {filename, data: byteArray.buffer}
        }, [byteArray.buffer]);
    }

    removeInputFileFromPyodideMemory(filename: string) {
        this.sendCommand("removeFile", filename)
            .catch(e => console.warn(e));
    }

    async saveResultFilesIntoZipArchive(): Promise<boolean> {
        await this.sendCommand("saveZip", null);
        return true;
    }

    runCurrentCodeFromWorkspace() {
        let code: string|null = (this.state.getStrCodeToLaunch()).trim()
        if (code.length === 0) {
            this.state.setStrCodeOutput('# Пустая программа\n');
            return;
        }
        this.runPythonCode(code);
    }
}