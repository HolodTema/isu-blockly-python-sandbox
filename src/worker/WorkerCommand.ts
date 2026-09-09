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
