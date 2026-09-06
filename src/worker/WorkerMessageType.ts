export enum WorkerMessageType {
    Init = "init",
    Log = "log",
    Stdout = "stdout",
    Error = "error",
    Done = "done",

    Run = "run",

    Debug = "debug",
    DebugCommand = "debugCommand",
    DebugDone = "debugDone",
    DebugBreakpoint = "debugBreakpoint",
    DebugVariables = "debugVariables",
    DebugData = "debugData",

    LoadFile = "loadFile",
    RemoveFile = "removeFile",
    FileLoaded = "fileLoaded",
    FileRemoved = "fileRemoved",

    SaveZip = "saveZip",
    ZipReady = "zipReady",

    ListOutputFiles = "listOutputFiles",
    ReadOutputFile = "readOutputFile",

    ReadDebugFile = "readDebugFile",
    GetDebugVariables = "getDebugVariables",
}
