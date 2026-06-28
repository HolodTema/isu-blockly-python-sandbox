
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
        a.download = "project.chef";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
}

function setButtonOpenProjectListener(blocklyWorkspace) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".chef";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    fileInput.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (!file) {
            console.log("No file is selected.");
            return;
        }

        const fileReader = new FileReader();
        fileReader.onload = function (e) {
            try {
                const content = e.target.result;
                const project = JSON.parse(content);

                if (typeof project.python !== "string") {
                    console.log("Error: unable to open project from invalid .chef file");
                    return;
                }
                if (!project.blocklyState || typeof project.blocklyState !== "object") {
                    console.log("Error: unable to open project from invalid .chef file");
                    return;
                }

                window.codeMirror.setValue(project.python);
                blocklyWorkspace.clear();
                Blockly.serialization.workspaces.load(project.blocklyState, blocklyWorkspace);
                console.log("The project from file was opened.");
            }
            catch (e) {
                console.error("Unable to open project from file:", e);
            }
            finally {
                fileInput.value = "";
            }
        }

        fileReader.onerror = function () {
            alert("Unable to open project from file");
            fileInput.value = "";
        }
        fileReader.readAsText(file, "UTF-8");
    });

    const buttonOpenProject = document.getElementById("button_open_project");
    buttonOpenProject.addEventListener("click", function () {
        fileInput.click();
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
            setButtonOpenProjectListener(blocklyWorkspace);
        });
    });
}

