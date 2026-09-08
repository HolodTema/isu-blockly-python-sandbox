import {AppState} from "../state/AppState";
import {CodeOutputTabType} from "../state/CodeOutputTabType";
import {WorkerCommand} from "../worker/WorkerCommand";
import {WorkerEvent} from "../worker/WorkerEvent";
import PyodideWorker from '../worker/pyodideWorker.ts?worker';

export class PyodideService {
    private worker: Worker;
    private isInitComplete: boolean = false;
    private mapPendingPromises: Map<number, {resolve: Function; reject: Function}> = new Map();
    private workerCommandPromiseId: number = 0;

    constructor(private state: AppState) {
        this.worker = new PyodideWorker();
        this.worker.addEventListener("message", (event: MessageEvent<any>) => {
            const msg = event.data;
            if (typeof msg === "string" && msg === "WorkerEvent.OnDebugFileCreated") {
                this.sendWorkerCommandAsync(WorkerCommand.ReadDebugFile, null)
                    .then(data => {
                        this.state.setRecordDebugVariables(data.variables);
                        this.state.setDebugCurrentLine(data.line);
                        this.state.setCurrentCodeOutputTabType(CodeOutputTabType.Debug);
                    })
                    .catch(err => console.error("Failed to read debug file:", err));
                return;
            }
            if (msg.type === WorkerEvent.InitComplete) {
                this.isInitComplete = true;
                console.log("Pyodide worker: init complete");
                return;
            }
            if (msg.type === WorkerEvent.Stdout) {
                const currentCodeOutput = this.state.getStrCodeOutput();
                this.state.setStrCodeOutput(currentCodeOutput + msg.payload);
                return;
            }
            if (msg.type === WorkerEvent.Log) {
                console.log("Pyodide worker:", msg.payload);
                return;
            }
            if (msg.type === WorkerEvent.DebugCodeDone) {
                this.state.setIsDebugging(false);
                this.state.setRecordDebugVariables({});
                this.state.setDebugCurrentLine(null);
                return;
            }
            if (msg.type === WorkerEvent.OnDebugFileRead) {
                this.state.setRecordDebugVariables(msg.payload.variables);
                this.state.setDebugCurrentLine(msg.payload.line);
                this.state.setCurrentCodeOutputTabType(CodeOutputTabType.Debug);
                return;
            }
            if (msg.type === WorkerEvent.Error) {
                const errorMessage = msg.payload || "Unknown PyodideWorker error";
                this.state.setStrCodeOutput(`Error: ${errorMessage}`);
                if (this.state.getIsRunning()) {
                    this.state.setIsRunning(false);
                }
                if (this.state.getIsDebugging()) {
                    this.state.setIsDebugging(false);
                    this.state.setRecordDebugVariables({});
                    this.state.setDebugCurrentLine(null);
                }
            }
            if (msg.type === WorkerEvent.RunCodeDone) {
                this.state.setIsRunning(false);
            }
            if (msg.type === WorkerEvent.RunCodeCancelled) {
                this.state.setIsRunning(false);
            }
            if (msg.type === WorkerEvent.DebugCodeCancelled) {
                this.state.setIsDebugging(false);
                this.state.setRecordDebugVariables({});
                this.state.setDebugCurrentLine(null);
            }
            if (msg.type === WorkerEvent.OutputFilesZipReady) {
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

    async runCode() {
        const code = this.state.getStrCodeToLaunch().trim();
        if (code.length === 0) {
            this.state.setStrCodeOutput('# Пустая программа\n');
            return;
        }
        await this.waitForInitComplete();
        const arrInputFiles: string[] = Array.from(this.state.getInputFilenames());
        this.state.setStrCodeOutput("");
        this.state.setIsRunning(true);
        try {
            await this.sendWorkerCommandAsync(WorkerCommand.StartRunCode, { code, arrInputFiles });
        }
        catch (error: any) {
            this.state.setStrCodeOutput(`Runtime error: ${error.message}`);
            console.error("Pyodide error:", error);
        }
    }

    async debugCode(code: string, breakpoints: number[], inputFilenames: string[] = []): Promise<void> {
        await this.waitForInitComplete();
        this.state.setStrCodeOutput("")
        this.state.setRecordDebugVariables({});
        this.state.setDebugCurrentLine(null);
        this.state.setIsDebugging(true);
        try {
            await this.sendWorkerCommandAsync(WorkerCommand.StartDebugCode, { code, breakpoints, inputFilenames });
        }
        catch (e) {
            this.state.setStrCodeOutput(`Debug error: ${e}`);
            this.state.setIsDebugging(false);
            console.error("Debug error:", e);
        }
    }

    stopCodeExecution() {
        if (this.state.getIsDebugging()) {
            this.sendDebugUserCommandStop();
        }
        else {
            this.sendWorkerCommand(WorkerCommand.StopRunCode)
        }
    }

    loadInputFile(filename: string, byteArray: Uint8Array) {
        this.sendWorkerCommand(WorkerCommand.LoadInputFile, {filename, data: byteArray.buffer});
    }

    removeInputFile(filename: string) {
        this.sendWorkerCommand(WorkerCommand.RemoveInputFile, filename)
    }

    sendDebugUserCommandContinue() {
        this.sendWorkerCommand(WorkerCommand.DebugUserCommandContinue);
    }

    sendDebugUserCommandStep() {
        this.sendWorkerCommand(WorkerCommand.DebugUserCommandStep);
    }

    sendDebugUserCommandStop() {
        this.sendWorkerCommand(WorkerCommand.DebugUserCommandStop);
    }

    async saveOutputFilesZip(): Promise<void> {
        await this.sendWorkerCommandAsync(WorkerCommand.SaveOutputFilesZip);
    }

    async getListOutputFiles(): Promise<string[]> {
        const result = await this.sendWorkerCommandAsync(WorkerCommand.GetListOutputFiles, null);
        return result as string[];
    }

    async readOutputFile(filename: string): Promise<string> {
        const result = await this.sendWorkerCommandAsync(WorkerCommand.ReadOutputFile, filename);
        return result as string;
    }

    private sendWorkerCommand(type: WorkerCommand, payload?: any) {
        this.worker.postMessage({
            type: type,
            payload: payload
        });
    }

    private async sendWorkerCommandAsync(type: WorkerCommand, payload?: any): Promise<any> {
        return new Promise((resolve: Function, reject: Function) => {
            const id: number = this.workerCommandPromiseId++;
            this.mapPendingPromises.set(id, {resolve, reject});
            this.worker.postMessage({id, type, payload});
        });
    }

    private async waitForInitComplete(): Promise<void> {
        if (this.isInitComplete) return;
        await new Promise((resolve) => {
            const check = () => {
                if (this.isInitComplete) {
                    resolve({});
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
}
