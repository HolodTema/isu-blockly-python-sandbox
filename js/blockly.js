export default function configureBlocklyLib() {
    Blockly.Blocks['start_block'] = {
        init: function() {
            this.appendDummyInput().appendField("Начало");
            this.setNextStatement(true, null);
            this.setColour('#FF0000');
            this.setTooltip('Стартовый блок программы');
        }
    };

    Blockly.defineBlocksWithJsonArray([
        {
            "type": "print_block",           // Уникальное имя блока
            "message0": "напечатать %1",     // Текст на блоке, %1 — это место для поля
            "args0": [                       // Аргументы блока
                {
                    "type": "input_value",       // Тип: входное значение
                    "name": "TEXT"               // Имя входа, будет использоваться в генераторе
                }
            ],
            "previousStatement": null,       // Может быть подключен к предыдущему блоку
            "nextStatement": null,           // Может быть подключен к следующему блоку
            "colour": 160,                   // Цвет блока (в оттенках серого или цветовой схеме)
            "tooltip": "Печатает текст в консоль", // Всплывающая подсказка
            "helpUrl": ""                    // Ссылка на документацию (опционально)
        }
    ]);

    Blockly.Python['print_block'] = function(block) {
        // Получаем сгенерированный код для блока, подключенного к входу 'TEXT'
        var text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_NONE) || '""';

        // Возвращаем строку кода на Python
        // Обратите внимание на \n в конце — это перенос строки
        return 'print(' + text + ')\n';
    };

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
                        type: "print_block"
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
            startScale: 1.2
        },
        trashcan: false
    });

    const startBlock = blocklyWorkspace.newBlock('start_block');
    startBlock.initSvg();
    startBlock.render();
    startBlock.moveBy(50, 30);
    startBlock.setDeletable(false);
    startBlock.setMovable(false);

    document.getElementById("button_convert_to_code")
        .addEventListener("click", function () {
            const topBlocks = blocklyWorkspace.getTopBlocks(true);
            const startBlock = topBlocks.find(b => b.type === "start_block");

            if (startBlock == null) {
                console.error("Error: start block is deleted, but it cannot be deleted.");
            }
            else {
                const secondBlock = startBlock.getNextBlock();
                if (secondBlock == null) {
                    window.codeMirror.setValue("# Пустая программа");
                }
                else {
                    const code = Blockly.Python.blockToCode(secondBlock);
                    window.codeMirror.setValue(code);
                }
            }
        });
}

