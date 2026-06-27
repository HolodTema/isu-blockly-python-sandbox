export default function configurePyodide() {
    async function main() {
        console.log("pyodide loading started");
        let pyodide = await loadPyodide();
        console.log("Pyodide is loaded");

        const buttonRunCode = document.getElementById("button_run_code");
        const textAreaPythonCode = document.getElementById("python_code");
        const codeOutput = document.getElementById("code_output");

        buttonRunCode.addEventListener("click", function () {
            pyodide.runPython("import sys; from io import StringIO; sys.stdout = StringIO()");
            const code = window.codeMirror.getValue();
            pyodide.runPython(code);
            const output = pyodide.runPython("sys.stdout.getvalue()");
            codeOutput.textContent = output || "Вывод отсутствует";
        });
    }

    main();
}
