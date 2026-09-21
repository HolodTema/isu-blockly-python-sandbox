/**
 * Commands sent from main thread to the worker.
 *
 * Every command is sent inside a message with three fields: `id`, `type`,
 * `payload`. The `id` is a unique number; if the command expects a reply,
 * worker sends it back with the same `id`. Commands which do not expect any
 * reply still carry an `id`, but it is just ignored.
 *
 * Values here are strings, not numbers, because they are visible in DevTools
 * when debugging `postMessage` traffic. Numbers would make the log unreadable.
 */
export enum WorkerCommand {
    Init = "init",
    StartRunCode = "startRunCode",
    StopRunCode = "stopRunCode",

    StartDebugCode = "startDebugCode",
    DebugUserCommandContinue = "debugUserCommandContinue",
    DebugUserCommandStep = "debugUserCommandStep",
    DebugUserCommandStop = "debugUserCommandStop",
    ReadDebugFile = "readDebugFile",

    LoadInputFile = "loadInputFile",
    RemoveInputFile = "removeInputFile",

    SaveOutputFilesZip = "saveOutputFilesZip",
    GetListOutputFiles = "getListOutputFiles",
    ReadOutputFile = "readOutputFile",
}
