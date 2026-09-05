import type { MainToWorkerCommand, WorkerToMainMessage } from "../../shared/types";

export class PyodideWorkerClient {
    private worker = new Worker(new URL("../../worker/pyodideWorker.js", import.meta.url));
    private pending = new Map<number, {resolve:(v:unknown)=> void; reject: (e:Error)=> void}>();
    private nextId = 0;
    private ready: Promise<void>;
    private onStdout: (chunk: string) => void;

    constructor(onStdout: (chunk: string) => void) {
        this.onStdout = onStdout;
        this.ready = new Promise((resolve) => {
            this.worker.addEventListener("message", (e: MessageEvent<WorkerToMainMessage>) => {
                this.handleMessage(e.data, resolve);
            });
        });
    }

    private settle(msg: Extract<WorkerToMainMessage, { id: number }>) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        msg.type === "error" ? p.reject(new Error(msg.payload)) : p.resolve(msg.payload);
    }


    private downloadZip(data: ArrayBuffer) {
        const url = URL.createObjectURL(new Blob([data], { type: "application/zip" }));
        const a = Object.assign(document.createElement("a"), { href: url, download: "result_files.zip" });
        a.click();
        URL.revokeObjectURL(url);
    }

    private handleMessage(msg: WorkerToMainMessage, resolveReady: () => void) {
        if (msg.type === "init") return resolveReady();
        if (msg.type === "stdout") return this.onStdout(msg.payload);
        if (msg.type === "log") return console.log("Pyodide worker:", msg.payload);
        if (msg.type === "error") return console.error("Pyodide worker error:", msg.payload);
        if (msg.type === "zipReady") return this.downloadZip(msg.payload);
        if ("id"in msg) this.settle(msg)
}
 private send<T>(cmd: Omit<MainToWorkerCommand, "id">, transfer: Transferable[] = []): Promise<T> {
        const id = this.nextId++;
        this.worker.postMessage({ id, ...cmd }, transfer);
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
        });
    }

    async run(code: string): Promise<void> {
        await this.ready;
        await this.send({ type: "run", payload: code });
    }

    loadFile(filename: string, data: Uint8Array) {
        const buffer = data.buffer as unknown as ArrayBuffer;
        return this.send({ type: "loadFile", payload: { filename, data: buffer } }, [buffer]);
    }

    removeFile(filename: string) {
        return this.send({ type: "removeFile", payload: filename });
    }

    saveZip() {
        return this.send({ type: "saveZip", payload: null });
    }

    dispose() {
        this.worker.terminate();
    }
}

