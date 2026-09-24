import { WorkerCommand } from "../../worker/WorkerCommand";
import { WorkerEvent } from "../../worker/WorkerEvent";
import PyodideWorker from "../../worker/pyodideWorker.ts?worker";

interface PromiseCallbacks {
    resolve(value: unknown): void;
    reject(error: Error): void;
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

/**
 * Client wrapper for communication with Pyodide Web Worker.
 *
 * Every command to worker is sent as message with unique numeric id. Commands
 * which expect answer (like `runCode`) wait for response with same id and
 * resolve promise. Commands which do not expect answer (like `stopCode`) just
 * send message and return nothing.
 *
 * Worker can also send unsolicited events without id — for example stdout
 * chunks or debug pause signal. Those are routed to callbacks which are passed
 * in constructor.
 */
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

    private handleWorkerEvent(raw: unknown) {
        if (typeof raw === "string") {
            // python code on breakpoint sends plain string, not WorkerEvent object from worker
            if (raw === WorkerEvent.OnDebugFileCreated) {
                console.log("WorkerEvent.OnDebugFileCreated");
                this.callbacks.onDebugPaused?.();
            }
            return;
        }
        const msg = raw as { id?: number; type: WorkerEvent; payload?: unknown };
        if (msg.type === WorkerEvent.InitComplete) {
            this.isInitComplete = true;
            this.resolveReady();
            return;
        }
        if (msg.type === WorkerEvent.Stdout) {
            this.callbacks.onStdout(msg.payload as string);
            return;
        }
        if (msg.type === WorkerEvent.Log) {
            console.log("Pyodide worker:", msg.payload);
            return;
        }
        if (msg.type === WorkerEvent.OutputFilesZipReady) {
            this.callbacks.onOutputFilesZip?.(msg.payload as ArrayBuffer);
            return;
        }
        if (typeof msg.id !== "number") {
            if (msg.type === WorkerEvent.Error) {
                this.callbacks.onError?.(msg.payload as string);
            }
            return;
        }

        const promise = this.mapPromiseCallbacks.get(msg.id);
        if (!promise) return;
        this.mapPromiseCallbacks.delete(msg.id);
        if (msg.type === WorkerEvent.Error) {
            promise.reject(new Error(msg.payload as string));
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

    /**
     * Returns promise which resolves when worker finishes initialization.
     *
     * Initialization includes loading Pyodide, installing packages
     * (`requests`, `pandas`, `lxml`, `micropip`) and running init script.
     * Usually takes several seconds on first load, so UI should show
     * splash screen until this promise resolves.
     */
    whenReady(): Promise<void> {
        return this.ready;
    }

    /**
     * Tells if initialization is already complete.
     *
     * Returns `false` until worker sends `InitComplete` event. Unlike
     * {@link whenReady}, this getter is synchronous and can be checked inside
     * render or event handlers without waiting.
     */
    get isReady(): boolean {
        return this.isInitComplete;
    }

    /**
     * Runs Python code in worker and waits until it finishes.
     *
     * Code is transformed before execution: each top-level statement gets
     * `_check_stop_run_code()` call in front of it, so user can stop long
     * loops by pressing stop button. stdin is installed as `io.StringIO`
     * with given text.
     *
     * @param code - Python code to execute.
     * @param inputFilenames - Names of files which should stay in worker
     *   filesystem. All other files are removed before run — this gives
     *   clean state between runs.
     * @param stdinText - Text which will be used as stdin source. Each line
     *   becomes one `input()` call.
     * @returns Promise which resolves with result of `runPythonAsync` or
     *   rejects if Python code raised exception.
     */
    async runCode(code: string, inputFilenames: string[] = [], stdinText: string = ''): Promise<unknown> {
        await this.ready;
        return this.send(WorkerCommand.StartRunCode, { code, inputFilenames, stdinText });
    }

    /**
     * Sends stop signal to worker. Does not wait for answer.
     *
     * Works only for regular code execution — in debug mode use
     * {@link debugStop} instead, because debug code waits on future and
     * stop flag would not wake it up.
     */
    stopCode(): void {
        this.notify(WorkerCommand.StopRunCode);
    }

    /**
     * Uploads file into worker filesystem. File becomes available for Python
     * code by given name.
     *
     * If file with same name already exists, it is silently overwritten.
     * This behavior can change in future, see IN-04 in manual test checklist.
     */
    async loadInputFile(filename: string, data: Uint8Array): Promise<void> {
        await this.ready;
        const buffer = data.buffer as ArrayBuffer;
        this.notify(WorkerCommand.LoadInputFile, { filename, data: buffer });
    }

    /**
     * Removes file from worker filesystem. Does not throw if file is missing —
     * worker just logs error into console.
     */
    removeInputFile(filename: string): void {
        this.notify(WorkerCommand.RemoveInputFile, filename);
    }

    /**
     * Replaces debug pause callback. Useful when hook wants to change handler
     * without recreating whole client.
     */
    setDebugPausedHandler(handler: () => void): void {
        this.callbacks.onDebugPaused = handler;
    }

    /**
     * Runs Python code in debug mode with given breakpoints.
     *
     * Code is transformed before execution: each top-level statement gets
     * `await _check_breakpoint(N)` in front of it, where N is 1-based line
     * number. When execution hits line from breakpoints list, worker pauses
     * and sends `OnDebugFileCreated` event with current variables snapshot.
     *
     * Promise resolves only when debugging is fully done (code finished,
     * user stopped it or exception was raised).
     *
     * @param code - Python code to execute.
     * @param breakpoints - 1-based line numbers where execution should pause.
     * @param inputFilenames - Names of files to keep in worker filesystem.
     * @param stdinText - Text which will be used as stdin source.
     */
    async debugCode(code: string, breakpoints: number[], inputFilenames: string[] = [], stdinText: string = ''): Promise<unknown> {
        await this.ready;
        return this.send(WorkerCommand.StartDebugCode, { code, breakpoints, inputFilenames, stdinText });
    }

    /**
     * Reads last debug snapshot from worker filesystem.
     *
     * Should be called only after `OnDebugFileCreated` event, otherwise
     * returns data from previous pause or throws if there was no pause yet.
     */
    readDebugSnapshot(): Promise<DebugSnapshot> {
        return this.send(WorkerCommand.ReadDebugFile, null);
    }

    /**
     * Tells worker to continue execution until next breakpoint.
     */
    debugContinue(): void {
        this.notify(WorkerCommand.DebugUserCommandContinue);
    }

    /**
     * Tells worker to continue execution but pause on very next line.
     */
    debugStep(): void {
        this.notify(WorkerCommand.DebugUserCommandStep);
    }

    /**
     * Stops debug session from inside paused state.
     *
     * Unlike {@link stopCode}, this works while debug code is waiting on
     * future — it raises CancelledError inside paused coroutine.
     */
    debugStop(): void {
        this.notify(WorkerCommand.DebugUserCommandStop);
    }

    /**
     * Asks worker to pack all output files into zip archive. When archive is
     * ready, `onOutputFilesZip` callback is called with archive bytes.
     */
    saveOutputFilesZip(): void {
        this.notify(WorkerCommand.SaveOutputFilesZip);
    }

    /**
     * Returns list of files which exist in worker filesystem right now.
     *
     * Includes internal files (like `__debug_data.json`), but not input files
     * which are just uploaded by user. Filtering of input files happens on
     * consumer side, see `useInputOutputFiles`.
     */
    listOutputFiles(): Promise<string[]> {
        return this.send(WorkerCommand.GetListOutputFiles, null);
    }

    /**
     * Reads file content as UTF-8 string. Throws if file does not exist or
     * is binary.
     */
    readOutputFile(filename: string): Promise<string> {
        return this.send(WorkerCommand.ReadOutputFile, filename);
    }

    /**
     * Terminates worker and clears all pending promises.
     *
     * Pending promises are not rejected — they just stay unresolved forever.
     * This is fine for unmount, because no one waits for them anymore.
     */
    dispose(): void {
        this.mapPromiseCallbacks.clear();
        this.worker.terminate();
    }
}
