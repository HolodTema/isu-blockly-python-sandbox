/**
 * Events sent from worker back to main thread.
 *
 * Events fall into two groups: replies to specific commands (they carry the
 * same `id` as the request) and unsolicited events (they have no `id` or the
 * `id` is not used). The client routes replies to pending promises and
 * unsolicited events to callbacks.
 *
 * `OnDebugFileCreated` is special: it is sent as a plain string, not as an
 * object, because it comes from Python code via `js.postMessage` and bypasses
 * the normal worker message wrapping.
 */
export enum WorkerEvent {
    InitComplete = "initComplete",
    Log = "log",
    Stdout = "stdout",
    Error = "error",
    RunCodeDone = "runCodeDone",
    RunCodeCancelled = "runCodeCancelled",

    DebugCodeDone = "debugCodeDone",
    DebugCodeCancelled = "debugCodeCancelled",

    OnDebugFileCreated = "WorkerEvent.OnDebugFileCreated",
    OnDebugFileRead = "onDebugFileRead",

    OnInputFileLoaded = "onInputFileLoaded",
    OnInputFileRemoved = "onInputFileRemoved",

    OutputFilesZipReady = "outputFilesZipReady",
    ListOutputFilesResult = "listOutputFilesResult",
    ReadOutputFileResult = "readOutputFileResult",
}
