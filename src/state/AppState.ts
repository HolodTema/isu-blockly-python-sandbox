import {AppStateKey} from "./AppStateKey";

export class AppState {
    private jsonBlocklyState: {[p: string]: any}|null = null;
    private strCodeToLaunch: string = "";
    private strCodeToShow: string = "";
    private strGeneratedCode: string = "";
    private strCodeOutput: string = "";
    private setInputFilenames: Set<string> = new Set();
    private listeners: Array<(key: AppStateKey, state: AppState)=>void> = [];

    subscribe(listener: (key: AppStateKey, state: AppState)=>void) {
        this.listeners.push(listener);
    }

    setJsonBlocklyState(jsonBlocklyState: any) {
        this.jsonBlocklyState = jsonBlocklyState;
        this.notifyAllListeners(AppStateKey.JsonBlocklyState);
    }

    setStrGeneratedCode(strGeneratedCode: string) {
        this.strGeneratedCode = strGeneratedCode;
        this.notifyAllListeners(AppStateKey.StrGeneratedCode);
    }

    setStrCodeOutput(strCodeOutput: string) {
        this.strCodeOutput = strCodeOutput;
        this.notifyAllListeners(AppStateKey.StrCodeOutput);
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

    getStrGeneratedCode(): string {
        return this.strGeneratedCode;
    }

    getStrCodeOutput(): string {
        return this.strCodeOutput;
    }

    private notifyAllListeners(updatedKey: AppStateKey) {
        this.listeners.forEach((listener) => {
            listener(updatedKey, this);
        });
    }
}
