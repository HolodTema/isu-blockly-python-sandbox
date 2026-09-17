import { WorkerCommand } from "../../worker/WorkerCommand";
import { WorkerEvent } from "../../worker/WorkerEvent";
import PyodideWorker from "../../worker/pyodideWorker.ts?worker";

interface PromiseCallbacks {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
}

export interface DebugSnapshot {
    line: number;
    variables: Record<string, string>;
}

export interface PyodideWorkerCallbacks {
    onStdout: (chunk: string) => void;
    onError?: (message: string) => void;
    onOutputFilesZip?: (data: ArrayBuffer) => void;
    onDebugPaused?: () => void;
}

export class PyodideWorkerClient {
    private worker: Worker;
    private mapPromiseCallbacks = new Map<number, PromiseCallbacks>();
    private nextPromiseCallbackId = 0;
    private isInitComplete = false;
    private resolveReady!: () => void;
    private ready = new Promise<void>((resolve) => {
        this.resolveReady = resolve;
    });

    constructor(private callbacks: PyodideWorkerCallbacks) {
        this.worker = new PyodideWorker();
        this.worker.addEventListener("message", (event: MessageEvent) => {
            this.handleWorkerEvent(event.data);
        });
    }

    private handleWorkerEvent(msg: any) {
        if (typeof msg === "string") {
            // python code on breakpoint sends plain string, not WorkerEvent object from worker
            if (msg === WorkerEvent.OnDebugFileCreated) {
                console.log("WorkerEvent.OnDebugFileCreated");
                this.callbacks.onDebugPaused?.();
            }
            return;
        }
        if (msg.type === WorkerEvent.InitComplete) {
            this.isInitComplete = true;
            this.resolveReady();
            return;
        }
        if (msg.type === WorkerEvent.Stdout) {
            this.callbacks.onStdout(msg.payload);
            return;
        }
        if (msg.type === WorkerEvent.Log) {
            console.log("Pyodide worker:", msg.payload);
            return;
        }
        if (msg.type === WorkerEvent.OutputFilesZipReady) {
            this.callbacks.onOutputFilesZip?.(msg.payload);
            return;
        }
        if (typeof msg.id !== "number") {
            if (msg.type === WorkerEvent.Error) {
                this.callbacks.onError?.(msg.payload);
            }
            return;
        }

        const promise = this.mapPromiseCallbacks.get(msg.id);
        if (!promise) return;
        this.mapPromiseCallbacks.delete(msg.id);
        if (msg.type === WorkerEvent.Error) {
            promise.reject(new Error(msg.payload));
        } else {
            promise.resolve(msg.payload);
        }
    }

    private send<T>(type: WorkerCommand, payload: unknown, transfer: Transferable[] = []): Promise<T> {
        const id = this.nextPromiseCallbackId++;
        return new Promise<T>((resolve, reject) => {
            this.mapPromiseCallbacks.set(id, { resolve, reject });
            this.worker.postMessage({ id, type, payload }, transfer);
        });
    }

    private notify(type: WorkerCommand, payload: unknown = null) {
        this.worker.postMessage({ id: this.nextPromiseCallbackId++, type, payload });
    }

    whenReady(): Promise<void> {
        return this.ready;
    }

    get isReady(): boolean {
        return this.isInitComplete;
    }

    async runCode(code: string, inputFilenames: string[] = []): Promise<unknown> {
        await this.ready;
        return this.send(WorkerCommand.StartRunCode, { code, inputFilenames });
    }

    stopCode(): void {
        this.notify(WorkerCommand.StopRunCode);
    }

    async loadInputFile(filename: string, data: Uint8Array): Promise<void> {
        await this.ready;
        const buffer = data.buffer as ArrayBuffer;
        this.notify(WorkerCommand.LoadInputFile, { filename, data: buffer });
    }

    removeInputFile(filename: string): void {
        this.notify(WorkerCommand.RemoveInputFile, filename);
    }

    setDebugPausedHandler(handler: () => void): void {
        this.callbacks.onDebugPaused = handler;
    }

    async debugCode(code: string, breakpoints: number[], inputFilenames: string[] = []): Promise<unknown> {
        await this.ready;
        console.log("pyodideWorkerClient.debugCode()");
        return this.send(WorkerCommand.StartDebugCode, { code, breakpoints, inputFilenames });
    }

    readDebugSnapshot(): Promise<DebugSnapshot> {
        return this.send(WorkerCommand.ReadDebugFile, null);
    }

    debugContinue(): void {
        this.notify(WorkerCommand.DebugUserCommandContinue);
    }

    debugStep(): void {
        this.notify(WorkerCommand.DebugUserCommandStep);
    }

    debugStop(): void {
        this.notify(WorkerCommand.DebugUserCommandStop);
    }

    saveOutputFilesZip(): void {
        this.notify(WorkerCommand.SaveOutputFilesZip);
    }

    listOutputFiles(): Promise<string[]> {
        return this.send(WorkerCommand.GetListOutputFiles, null);
    }

    readOutputFile(filename: string): Promise<string> {
        return this.send(WorkerCommand.ReadOutputFile, filename);
    }

    dispose(): void {
        this.mapPromiseCallbacks.clear();
        this.worker.terminate();
    }
}
