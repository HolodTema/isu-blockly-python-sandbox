
export class AppState {
    constructor() {
        this.jsonBlocks = null;
        this.generatedCode = null;
        this.codeOutput = null;
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notifyAllListeners(updatedKey) {
        this.listeners.forEach( listener => {
            listener(updatedKey, this);
        });
    }

    setJsonBlocks(jsonBlocks) {
        this.jsonBlocks = jsonBlocks;
        this.notifyAllListeners("jsonBlocks");
    }

    setGeneratedCode(generatedCode) {
        this.generatedCode = generatedCode;
        this.notifyAllListeners("generatedCode");
    }

    setCodeOutput(codeOutput) {
        this.codeOutput = codeOutput;
        this.notifyAllListeners("codeOutput");
    }
}
