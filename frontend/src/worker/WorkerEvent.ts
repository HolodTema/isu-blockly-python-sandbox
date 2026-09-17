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
