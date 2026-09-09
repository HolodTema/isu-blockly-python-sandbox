import { WorkerCommand } from "../../worker/WorkerCommand";
import { WorkerEvent } from "../../worker/WorkerEvent";
import PyodideWorker from "../../worker/pyodideWorker.ts?worker";

interface PendingPromise {
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

// Питоновский код на брейкпоинте шлёт из воркера сырую строку, а не объект.
const DEBUG_PAUSED_MESSAGE = "WorkerEvent.OnDebugFileCreated";

export class PyodideWorkerClient {
    private worker: Worker;
    private pending = new Map<number, PendingPromise>();
    private nextId = 0;
    private isInitComplete = false;
    private resolveReady!: () => void;
    private ready = new Promise<void>((resolve) => {
        this.resolveReady = resolve;
    });

    constructor(private callbacks: PyodideWorkerCallbacks) {
        this.worker = new PyodideWorker();
        this.worker.addEventListener("message", (event: MessageEvent) => {
            this.handleMessage(event.data);
        });
    }

    private handleMessage(msg: any) {
        if (typeof msg === "string") {
            if (msg === DEBUG_PAUSED_MESSAGE) {
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
        // Воркер отправляет архив без id, отдельным событием, а не ответом на команду.
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

        const promise = this.pending.get(msg.id);
        if (!promise) return;
        this.pending.delete(msg.id);
        if (msg.type === WorkerEvent.Error) {
            promise.reject(new Error(msg.payload));
        } else {
            promise.resolve(msg.payload);
        }
    }

    private send<T>(type: WorkerCommand, payload: unknown, transfer: Transferable[] = []): Promise<T> {
        const id = this.nextId++;
        return new Promise<T>((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.worker.postMessage({ id, type, payload }, transfer);
        });
    }

    private notify(type: WorkerCommand, payload: unknown = null) {
        this.worker.postMessage({ id: this.nextId++, type, payload });
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

    // Обработчик паузы ставится позже клиента: его владелец - отдельный хук отладки.
    setDebugPausedHandler(handler: () => void): void {
        this.callbacks.onDebugPaused = handler;
    }

    async debugCode(code: string, breakpoints: number[], inputFilenames: string[] = []): Promise<unknown> {
        await this.ready;
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
        this.pending.clear();
        this.worker.terminate();
    }
}
