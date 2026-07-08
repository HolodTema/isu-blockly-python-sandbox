
export class AppState {
    jsonBlocks: any = null;
    generatedCode: string|null = null;
    codeOutput: string|null = null;
    setInputFilenames: Set<string> = new Set();

    private listeners: Array<(key: string, state: AppState)=>void> = [];

    subscribe(listener: (key: string, state: AppState)=>void) {
        this.listeners.push(listener);
    }

    setJsonBlocks(jsonBlocks: any) {
        this.jsonBlocks = jsonBlocks;
        this.notifyAllListeners("jsonBlocks");
    }

    setGeneratedCode(generatedCode: string) {
        this.generatedCode = generatedCode;
        this.notifyAllListeners("generatedCode");
    }

    setCodeOutput(codeOutput: string) {
        this.codeOutput = codeOutput;
        this.notifyAllListeners("codeOutput");
    }

    isInputFilenameInSet(inputFilename: string): boolean {
        return this.setInputFilenames.has(inputFilename);
    }

    addInputFilename(inputFilename: string) {
        this.setInputFilenames.add(inputFilename);
        this.notifyAllListeners("inputFilename");
    }

    removeInputFilename(inputFilename: string) {
        this.setInputFilenames.delete(inputFilename);
        // TODO: I suppose to notify all listeners that I deleted input filename...
    }

    private notifyAllListeners(updatedKey: string) {
        this.listeners.forEach((listener) => {
            listener(updatedKey, this);
        });
    }
}
