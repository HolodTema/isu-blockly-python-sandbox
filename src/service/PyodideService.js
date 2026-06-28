
export class PyodideService {
    constructor(state) {
        this.state = state;
        this.pyodide = null;
        this.isInit = false;
        this.init();
    }

    async init() {
        try {
            console.log("Pyodide: init process started");
            this.pyodide = await loadPyodide();
            await this.pyodide.loadPackage("requests");
            this.isInit = true;
            console.log("Pyodide: init process finished");
        }
        catch (e) {
            console.error("Pyodide: init failed:", e);
        }
    }

    async runPythonCode(strCode) {
        if (!this.isInit) {
            console.error("Pyodide: you cannot run the code while pyodide init() is in progress");
            return;
        }

        try {
            this.pyodide.runPython("import sys; from io import StringIO; sys.stdout = StringIO()");
            this.pyodide.runPython(code);
            const output = this.pyodide.runPython("sys.stdout.getvalue()") || "Вывод отсутствует";
            this.state.setCodeOutput(output);
        }
        catch (e) {
            this.state.setCodeOutput(e.message);
        }
    }

    runCurrentCodeFromWorkspace() {
        const code = this.state.generatedCode;
        if (!code.trim()) {
            this.state.setCodeOutput("# Пустая программа\n");
            return;
        }
        this.runPythonCode(code);
    }
}