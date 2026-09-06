export enum WorkerEvent {
    InitComplete = "initComplete",
    Log = "log",
    Stdout = "stdout",
    Error = "error",

    RunCodeDone = "runCodeDone",
    DebugCodeDone = "debugCodeDone",

    DebugBreakpoint = "debugBreakpoint",
    DebugVariablesSnapshot = "debugVariables",
    DebugData = "debugData",
    OnDebugFileCreated = "onDebugFileCreated",

    OnInputFileLoaded = "onInputFileLoaded",
    OnInputFileRemoved = "onInputFileRemoved",

    OutputFilesZipReady = "outputFilesZipReady",
    ListOutputFilesResult = "listOutputFilesResult",
    ReadOutputFileResult = "readOutputFileResult",
}
