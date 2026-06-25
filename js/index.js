function configureBlocklyLib() {
    const blocklyToolbox = {
        kind: "categoryToolbox",
        contents: [
            {
                kind: "category",
                name: "Ввод-вывод",
                colour: "#0048ff",
                contents: [
                    {
                        kind: "block",
                        type: "print"
                    }
                ]
            },
            {
                kind: 'category',
                name: 'Логика',
                colour: '#5C81A6',
                contents: [
                    {kind: 'block', type: 'controls_if'},
                    {kind: 'block', type: 'logic_compare'},
                    {kind: 'block', type: 'logic_operation'},
                    {kind: 'block', type: 'logic_negate'},
                    {kind: 'block', type: 'logic_boolean'}
                ]
            },
            {
                kind: 'category',
                name: 'Циклы',
                colour: '#5CA65C',
                contents: [
                    {kind: 'block', type: 'controls_repeat_ext'},
                    {kind: 'block', type: 'controls_whileUntil'},
                    {kind: 'block', type: 'controls_for'}
                ]
            },
            {
                kind: 'category',
                name: 'Математика',
                colour: '#A65C5C',
                contents: [
                    {kind: 'block', type: 'math_number'},
                    {kind: 'block', type: 'math_arithmetic'},
                    {kind: 'block', type: 'math_single'},
                    {kind: 'block', type: 'math_trig'}
                ]
            },
            {
                kind: 'category',
                name: 'Текст',
                colour: '#A65CA6',
                contents: [
                    {kind: 'block', type: 'text'},
                    {kind: 'block', type: 'text_join'},
                    {kind: 'block', type: 'text_length'},
                    {kind: 'block', type: 'text_isEmpty'}
                ]
            },
            {
                kind: 'category',
                name: 'Переменные',
                colour: '#CC6633',
                contents: [
                    {kind: 'block', type: 'variables_get'},
                    {kind: 'block', type: 'variables_set'}
                ]
            },
            {
                kind: 'category',
                name: 'Функции',
                colour: '#3366CC',
                contents: [
                    {kind: 'block', type: 'procedures_defreturn'},
                    {kind: 'block', type: 'procedures_defnoreturn'},
                    {kind: 'block', type: 'procedures_callreturn'},
                    {kind: 'block', type: 'procedures_callnoreturn'}
                ]
            }
        ]
    };

    const blocklyWorkspace = Blockly.inject("blockly_workspace", {
        toolbox: blocklyToolbox,
        grid: {
            spacing: 20,
            length: 3,
            color: "#ccc",
            snap: true
        },
        zoom: {
            controls: true,
            wheel: true,
            startScale: 0.9
        },
        trashcan: false
    });

    document.getElementById("button_convert_to_code")
        .addEventListener("click", function () {
            const code = Blockly.JavaScript.workspaceToCode(blocklyWorkspace);
            document.getElementById("code_editor").textContent = code;
        });
}


function configureCodeMirror() {
    const textarea = document.getElementById("python_code");

    const editor = CodeMirror.fromTextArea(textarea, {
        mode: 'python',
        theme: 'material',
        lineNumbers: true,
        readOnly: true,
        gutters: ['CodeMirror-linenumbers', 'breakpoints'],
        styleActiveLine: true,
        scrollbarStyle: 'simple',
    });

    editor.on('gutterClick', function (cm, lineNumber, gutter) {
        console.log('Clicked on gutter:', gutter, 'line:', lineNumber);
        if (gutter !== 'breakpoints') return;

        const lineInfo = cm.lineInfo(lineNumber);
        if (lineInfo.gutterMarkers && lineInfo.gutterMarkers['breakpoints']) {
            cm.setGutterMarker(lineNumber, 'breakpoints', null);
        } else {
            const marker = document.createElement('div');
            marker.className = 'breakpoint-marker';
            cm.setGutterMarker(lineNumber, 'breakpoints', marker);
        }
    });
}

function configurePyodide() {
    async function main() {
        console.log("pyodide loading started");
        let pyodide = await loadPyodide();
        console.log("Pyodide is loaded");

        const buttonRunCode = document.getElementById("button_run_code");
        const textAreaPythonCode = document.getElementById("python_code");
        const codeOutput = document.getElementById("code_output");

        // buttonRunCode.addEventListener("click", function () {
        //     const code = textAreaPythonCode.textContent;
        //     let result = pyodide.runPython(code);
        //     codeOutput.textContent = result;
        // });

        buttonRunCode.addEventListener("click", function () {
            const code = textAreaPythonCode.textContent;

            pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
    `);

            pyodide.runPython(code);

            const output = pyodide.runPython("sys.stdout.getvalue()");
            codeOutput.textContent = output || "Вывод отсутствует";
        });
    }

    main();
}

function configureCodeOutputExpandButton() {
    const buttonOutputExpand = document.getElementById("button_expand_output")

    const codeOutput = document.getElementById("code_output");

    buttonOutputExpand.addEventListener("click", function () {
        if (codeOutput.className === "font_powered_cascadia_code code_output_expanded") {
            codeOutput.className = "font_powered_cascadia_code code_output_not_expanded";
            buttonOutputExpand.src = "assets/images/ic_expand_up.svg";
        } else {
            codeOutput.className = "font_powered_cascadia_code code_output_expanded";
            buttonOutputExpand.src = "assets/images/ic_expand_down.svg";
        }
    })
}

configureBlocklyLib();
configureCodeMirror();
configureCodeOutputExpandButton();
configurePyodide();