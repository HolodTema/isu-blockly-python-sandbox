
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
                    { kind: 'block', type: 'controls_if' },
                    { kind: 'block', type: 'logic_compare' },
                    { kind: 'block', type: 'logic_operation' },
                    { kind: 'block', type: 'logic_negate' },
                    { kind: 'block', type: 'logic_boolean' }
                ]
            },
            {
                kind: 'category',
                name: 'Циклы',
                colour: '#5CA65C',
                contents: [
                    { kind: 'block', type: 'controls_repeat_ext' },
                    { kind: 'block', type: 'controls_whileUntil' },
                    { kind: 'block', type: 'controls_for' }
                ]
            },
            {
                kind: 'category',
                name: 'Математика',
                colour: '#A65C5C',
                contents: [
                    { kind: 'block', type: 'math_number' },
                    { kind: 'block', type: 'math_arithmetic' },
                    { kind: 'block', type: 'math_single' },
                    { kind: 'block', type: 'math_trig' }
                ]
            },
            {
                kind: 'category',
                name: 'Текст',
                colour: '#A65CA6',
                contents: [
                    { kind: 'block', type: 'text' },
                    { kind: 'block', type: 'text_join' },
                    { kind: 'block', type: 'text_length' },
                    { kind: 'block', type: 'text_isEmpty' }
                ]
            },
            {
                kind: 'category',
                name: 'Переменные',
                colour: '#CC6633',
                contents: [
                    { kind: 'block', type: 'variables_get' },
                    { kind: 'block', type: 'variables_set' }
                ]
            },
            {
                kind: 'category',
                name: 'Функции',
                colour: '#3366CC',
                contents: [
                    { kind: 'block', type: 'procedures_defreturn' },
                    { kind: 'block', type: 'procedures_defnoreturn' },
                    { kind: 'block', type: 'procedures_callreturn' },
                    { kind: 'block', type: 'procedures_callnoreturn' }
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
        .addEventListener("click", function() {
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

    editor.on('gutterClick', function(cm, lineNumber, gutter) {
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

configureBlocklyLib();
configureCodeMirror();
