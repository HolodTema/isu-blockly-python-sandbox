import {AppState} from "../state/AppState";
import {WorkerMessageType} from "../worker/WorkerMessageType";
import {CodeOutputTabType} from "../state/CodeOutputTabType";

export class PyodideService {
    private worker: Worker;
    private isReady: boolean = false;
    private mapPendingPromises: Map<number, {resolve: Function; reject: Function}> = new Map();
    private messageId: number = 0;

    constructor(private state: AppState) {
        this.worker = new Worker(
            new URL("../worker/pyodideWorker.ts", import.meta.url),
            { type: "module" }
        );
        this.worker.addEventListener("message", (event: MessageEvent<any>) => {
            const msg = event.data;
            if (typeof msg === 'string' && msg === 'break') {
                this.sendCommand(WorkerMessageType.ReadDebugFile, null)
                    .then(data => {
                        this.state.setRecordDebugVariables(data.variables);
                        this.state.setDebugCurrentLine(data.line);
                        this.state.setCurrentCodeOutputTabType(CodeOutputTabType.Debug);
                    })
                    .catch(err => console.error("Failed to read debug file:", err));
                return;
            }
            if (msg.type === WorkerMessageType.Init) {
                this.isReady = true;
                console.log("Pyodide worker: init complete");
                return;
            }
            if (msg.type === WorkerMessageType.Stdout) {
                const currentCodeOutput = this.state.getStrCodeOutput();
                this.state.setStrCodeOutput(currentCodeOutput + msg.payload);
                return;
            }
            if (msg.type === WorkerMessageType.Log) {
                console.log("Pyodide worker:", msg.payload);
                return;
            }
            if (msg.type === WorkerMessageType.DebugBreakpoint) {
                const { line, variables_json } = msg.payload;
                // Если переменные ещё не получены, запрашиваем их
                if (variables_json === '{}') {
                    // Отправляем запрос на получение переменных
                    this.sendCommand(WorkerMessageType.GetDebugVariables, { line })
                        .then(vars => {
                            this.state.setRecordDebugVariables(vars);
                            this.state.setDebugCurrentLine(line);
                            this.state.setCurrentCodeOutputTabType(CodeOutputTabType.Debug);
                        })
                        .catch(err => console.error("Failed to get variables:", err));
                } else {
                    const variables = JSON.parse(variables_json);
                    this.state.setRecordDebugVariables(variables);
                    this.state.setDebugCurrentLine(line);
                    this.state.setCurrentCodeOutputTabType(CodeOutputTabType.Debug);
                }
                return;
            }
            if (msg.type === WorkerMessageType.DebugVariables) {
                this.state.setRecordDebugVariables(msg.payload);
                return;
            }
            if (msg.type === WorkerMessageType.DebugDone) {
                this.state.setIsDebugging(false);
                this.state.setDebugCurrentLine(null);
                return;
            }
            if (msg.type === WorkerMessageType.DebugData) {
                // Данные уже пришли в msg.payload (содержит line и variables)
                // Обновляем состояние
                this.state.setRecordDebugVariables(msg.payload.variables);
                this.state.setDebugCurrentLine(msg.payload.line);
                this.state.setCurrentCodeOutputTabType(CodeOutputTabType.Debug);
                return;
            }
            if (msg.type === WorkerMessageType.Error) {
                this.state.setStrCodeOutput(`Error: ${msg.payload}`);
            }
            if (msg.type === WorkerMessageType.ZipReady) {
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

    sendCommand(type: WorkerMessageType, payload: any): Promise<any> {
        return new Promise((resolve: Function, reject: Function) => {
            const id: number = this.messageId++;
            this.mapPendingPromises.set(id, {resolve, reject});
            this.worker.postMessage({id, type, payload});
        });
    }

    async runPythonCode(code: string, inputFilenames: string[] = []): Promise<void> {
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
            await this.sendCommand(WorkerMessageType.Run, { code, inputFilenames });
        }
        catch (error: any) {
            this.state.setStrCodeOutput(`Runtime error: ${error.message}`);
            console.error("Pyodide error:", error);
        }
    }

    saveInputFileToPyodideMemory(filename: string, byteArray: Uint8Array) {
        this.worker.postMessage({
            id: this.messageId++,
            type: WorkerMessageType.LoadFile,
            payload: {filename, data: byteArray.buffer}
        }, [byteArray.buffer]);
    }

    removeInputFileFromPyodideMemory(filename: string) {
        this.sendCommand(WorkerMessageType.RemoveFile, filename)
            .catch(e => console.warn(e));
    }

    sendDebugUserCommandContinue() {
        this.worker.postMessage({ type: WorkerMessageType.DebugUserCommandContinue });
    }

    sendDebugUserCommandStep() {
        this.worker.postMessage({ type: WorkerMessageType.DebugUserCommandStep });
    }

    sendDebugUserCommandStop() {
        this.worker.postMessage({ type: WorkerMessageType.DebugUserCommandStop });
    }

    async saveResultFilesIntoZipArchive(): Promise<boolean> {
        await this.sendCommand(WorkerMessageType.SaveZip, null);
        return true;
    }

    async runCurrentCodeFromWorkspace() {
        const code = this.state.getStrCodeToLaunch().trim();
        if (code.length === 0) {
            this.state.setStrCodeOutput('# Пустая программа\n');
            return;
        }
        const inputFiles = Array.from(this.state.getInputFilenames());
        await this.runPythonCode(code, inputFiles);
    }

    async listOutputFiles(): Promise<string[]> {
        const result = await this.sendCommand(WorkerMessageType.ListOutputFiles, null);
        return result as string[];
    }

    async readOutputFile(filename: string): Promise<string> {
        const result = await this.sendCommand(WorkerMessageType.ReadOutputFile, filename);
        return result as string;
    }

    async startDebug(code: string, breakpoints: number[], inputFilenames: string[] = []): Promise<void> {
        console.log('Breakpoints from editor:', breakpoints);
        if (!this.isReady) {
            await new Promise((resolve) => {
                const check = () => {
                    if (this.isReady) {
                        resolve({});
                    }
                    else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        }

        this.state.setStrCodeOutput("")
        this.state.setRecordDebugVariables({});
        this.state.setDebugCurrentLine(null);
        this.state.setIsDebugging(true);

        try {
            await this.sendCommand(WorkerMessageType.Debug, { code, breakpoints, inputFilenames });
            this.state.setIsDebugging(false);
        }
        catch (e) {
            this.state.setStrCodeOutput(`Debug error: ${e}`);
            this.state.setIsDebugging(false);
            console.error("Debug error:", e);
        }
    }
}
