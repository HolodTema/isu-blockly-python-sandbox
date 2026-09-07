import {AppStateKey} from "./AppStateKey";
import {CodeOutputTabType} from "./CodeOutputTabType";

export class AppState {
    private jsonBlocklyState: {[p: string]: any}|null = null;
    private strCodeToLaunch: string = "";
    private strCodeToShow: string = "";
    private strCodeOutput: string = "";
    private setInputFilenames: Set<string> = new Set();
    private currentCodeOutputTabType: CodeOutputTabType = CodeOutputTabType.Output;
    private recordDebugVariables: Record<string, any> = {};
    private isDebugging: boolean = false;
    private debugCurrentLine: number | null = null;
    private isRunning: boolean = false;
    private listeners: Array<(key: AppStateKey, state: AppState)=>void> = [];

    subscribe(listener: (key: AppStateKey, state: AppState)=>void) {
        this.listeners.push(listener);
    }

    setJsonBlocklyState(jsonBlocklyState: any) {
        this.jsonBlocklyState = jsonBlocklyState;
        this.notifyAllListeners(AppStateKey.JsonBlocklyState);
    }

    setStrCodeToLaunch(strCodeToLaunch: string) {
        this.strCodeToLaunch = strCodeToLaunch;
        this.notifyAllListeners(AppStateKey.StrCodeToLaunch);
    }

    setStrCodeToShow(strCodeToShow: string) {
        this.strCodeToShow = strCodeToShow;
        this.notifyAllListeners(AppStateKey.StrCodeToShow);
    }

    setStrCodeOutput(strCodeOutput: string) {
        this.strCodeOutput = strCodeOutput;
        this.notifyAllListeners(AppStateKey.StrCodeOutput);
    }

    setCurrentCodeOutputTabType(tabType: CodeOutputTabType) {
        this.currentCodeOutputTabType = tabType;
        this.notifyAllListeners(AppStateKey.CurrentCodeOutputTabType);
    }

    setRecordDebugVariables(vars: Record<string, any>) {
        this.recordDebugVariables = vars;
        this.notifyAllListeners(AppStateKey.RecordDebugVariables);
    }

    setIsDebugging(isDebugging: boolean) {
        this.isDebugging = isDebugging;
        this.notifyAllListeners(AppStateKey.IsDebugging);
    }

    setDebugCurrentLine(debugCurrentLine: number | null) {
        this.debugCurrentLine = debugCurrentLine;
        this.notifyAllListeners(AppStateKey.DebugCurrentLine);
    }

    setIsRunning(isRunning: boolean) {
        this.isRunning = isRunning;
        this.notifyAllListeners(AppStateKey.IsRunning);
    }

    isInputFilenameInSet(inputFilename: string): boolean {
        return this.setInputFilenames.has(inputFilename);
    }

    addInputFilename(inputFilename: string) {
        this.setInputFilenames.add(inputFilename);
        this.notifyAllListeners(AppStateKey.AddInputFilename);
    }

    removeInputFilename(inputFilename: string) {
        this.setInputFilenames.delete(inputFilename);
        this.notifyAllListeners(AppStateKey.RemoveInputFilename);
    }

    getJsonBlocklyState(): {[p: string]: any}|null {
        return this.jsonBlocklyState;
    }

    getStrCodeToLaunch(): string {
        return this.strCodeToLaunch;
    }

    getStrCodeToShow(): string {
        return this.strCodeToShow;
    }

    getStrCodeOutput(): string {
        return this.strCodeOutput;
    }

    getCurrentCodeOutputTabType(): CodeOutputTabType {
        return this.currentCodeOutputTabType;
    }

    getInputFilenames(): Set<string> {
        return this.setInputFilenames;
    }

    getRecordDebugVariables(): Record<string, any> {
        return this.recordDebugVariables;
    }

    getIsDebugging(): boolean {
        return this.isDebugging;
    }

    getDebugCurrentLine(): number | null {
        return this.debugCurrentLine;
    }

    getIsRunning(): boolean {
        return this.isRunning;
    }

    private notifyAllListeners(updatedKey: AppStateKey) {
        this.listeners.forEach((listener) => {
            listener(updatedKey, this);
        });
    }
}
