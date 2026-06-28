
function loadCustomBlocksFromFile(onCustomBlocksLoaded) {
    console.log("Blockly: loading custom blocks from file started.");
    fetch("../assets/blockly/blocks.json")
        .then(response => response.json())
        .then(jsonArray => {
            Blockly.defineBlocksWithJsonArray(jsonArray);
            console.log("Blockly: custom blocks have been loaded.");
            onCustomBlocksLoaded();
        })
        .catch(error => {
            console.error("Blockly: unable to load custom blocks from file.");
        });
}

function loadToolboxFromFile(onToolboxLoaded) {
    fetch("../assets/blockly/toolbox.json")
        .then(response => response.json())
        .then(toolboxJson => {
            console.log("Blockly: toolbox has been loaded from file.");
            onToolboxLoaded(toolboxJson);
        })
        .catch(error => {
            console.error("Blockly: unable to load toolbar from file.");
        });
}

function configureBlocksCodegen() {
    const blocklyPython = Blockly.Python;
    const blocksStorage = blocklyPython.forBlock || blocklyPython;

    blocksStorage["start_block"] = function(block) {
        return "";
    };
    blocksStorage["print_block"] = function(block) {
        var text = Blockly.Python.valueToCode(block, "TEXT", Blockly.Python.ORDER_NONE) || '""';
        return "print(" + text + ")\n";
    };
}

function createStartBlock(blocklyWorkspace) {
    const startBlock = blocklyWorkspace.newBlock('start_block');
    startBlock.initSvg();
    startBlock.render();
    startBlock.moveBy(50, 30);
    startBlock.setDeletable(false);
    startBlock.setMovable(false);
}

function setButtonConvertToCodeListener(blocklyWorkspace) {
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
                    Blockly.Python.init(blocklyWorkspace);
                    const code = Blockly.Python.blockToCode(secondBlock);
                    window.codeMirror.setValue(code);
                }
            }
        });
}

function setButtonSaveProjectListener(blocklyWorkspace) {
    const buttonSaveProject = document.getElementById("button_save_project");
    buttonSaveProject.addEventListener("click", function () {
        const pythonCode = window.codeMirror.getValue();
        console.log(Object.keys(Blockly.serialization));
        const jsonBlocklyState = Blockly.serialization.workspaces.save(blocklyWorkspace);

        const jsonProject = {
            python: pythonCode,
            blocklyState: jsonBlocklyState
        };

        const jsonProjectStr = JSON.stringify(jsonProject, null, 2);

        const blob = new Blob([jsonProjectStr], { type: "text/plain" });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "proj.blockly";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
}

export default function configureBlocklyLib() {
    loadCustomBlocksFromFile(() => {
        loadToolboxFromFile(toolboxJson => {

            const blocklyWorkspace = Blockly.inject("blockly_workspace", {
                toolbox: toolboxJson,
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

            configureBlocksCodegen();
            createStartBlock(blocklyWorkspace);
            setButtonConvertToCodeListener(blocklyWorkspace);
            setButtonSaveProjectListener(blocklyWorkspace);
        });
    });
}

