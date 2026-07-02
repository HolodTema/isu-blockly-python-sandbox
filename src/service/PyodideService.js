
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

    async runPythonCode(code) {
        if (!this.isInit) {
            console.error("Pyodide: you cannot run the code while pyodide init() is in progress");
            return;
        }

        try {
            this.pyodide.runPython("import sys; from io import StringIO; sys.stdout = StringIO()");
            this.pyodide.runPythonAsync(code);
            const output = this.pyodide.runPython("sys.stdout.getvalue()") || "Вывод отсутствует";
            console.log(output);
            this.state.setCodeOutput(output);
        }
        catch (e) {
            this.state.setCodeOutput(e.message);
        }
    }

    runCurrentCodeFromWorkspace() {
        const code = this.state.generatedCode?.trim();
        if (!code) {
            this.state.setCodeOutput("# Пустая программа\n");
            return;
        }
        this.runPythonCode(code);
    }

    saveInputFileToPyodideMemory(filename, byteArray) {
        this.pyodide.FS.writeFile(filename, byteArray);
        // this.pyodide.globals.set("target_filename", filename);
    }

    removeInputFileFromPyodideMemory(filename) {
        try {
            this.pyodide.FS.unlink(filename);
            console.log("Pyodide: input file removed from pyodide's memory successfully");
        }
        catch (e) {
            console.error("Pyodide: unable to remove input file from pyodide's memory because it does not exist.");
        }
    }

    async saveResultFilesIntoZipArchive() {
        try {
            const response = await fetch("public/assets/python/createZipArchiveOfResultFiles.py");
            const strPythonScript = await response.text();

            this.pyodide.runPython(strPythonScript);
            const zipBinaryData = this.pyodide.FS.readFile("/home/pyodide/exported_files.zip");

            const blob = new Blob([zipBinaryData], { type: "application/zip" });
            const invisibleLinkElement = document.createElement("a");
            invisibleLinkElement.href = URL.createObjectURL(blob);
            invisibleLinkElement.download = "result_files.zip";

            document.body.appendChild(invisibleLinkElement);
            invisibleLinkElement.click();
            document.body.removeChild(invisibleLinkElement);
            return true;
        }
        catch (e) {
            console.error("Pyodide: Unable to download result files:", e);
            return false;
        }
    }
}