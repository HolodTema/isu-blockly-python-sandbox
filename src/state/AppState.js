
export class AppState {
    constructor() {
        this.jsonBlocks = null;
        this.generatedCode = null;
        this.codeOutput = null;
        this.setInputFilenames = new Set();
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

    isInputFilenameInSet(inputFilename) {
        return this.setInputFilenames.has(inputFilename);
    }

    addInputFilename(inputFilename) {
        this.setInputFilenames.add(inputFilename);
        this.notifyAllListeners("setInputFilenames");
    }

    removeInputFilename(inputFilename) {
        const isDeleted = this.setInputFilenames.delete(inputFilename);
    }
}
