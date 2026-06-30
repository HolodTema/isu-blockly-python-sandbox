import * as Blockly from 'blockly';
import * as Ru from 'blockly/msg/ru';
import { pythonGenerator } from "blockly/python";

export class BlocklyService {
    constructor(state, htmlContainerId) {
        this.state = state;
        this.htmlContainerId = htmlContainerId;
        this.workspace = undefined;

        this.init();
    }

    async init() {
        try {
            const jsonBlocks = await fetch("/assets/blockly/blocks.json")
                .then(r => r.json());
            Blockly.defineBlocksWithJsonArray(jsonBlocks);

            const jsonToolbox = await fetch("/assets/blockly/toolbox.json")
                .then(r => r.json());

            Blockly.setLocale(Ru);

            this.workspace = Blockly.inject(this.htmlContainerId, {
                toolbox: jsonToolbox,
                grid: {spacing: 20, length: 3, color: '#ccc', snap: true},
                zoom: {controls: true, wheel: true, startScale: 1.2},
                trashcan: false
            });

            this.configureCodeGenerator();

            this.createStartBlock();

            this.workspace.addChangeListener((event) => {
                if (event.isUiEvent) {
                    return;
                }

                this.saveWorkspaceState();
                // this.generateAndUpdateCode();
            });

            if (this.state.blocksState) {
                Blockly.serialization.workspaces.load(this.state.blockState, this.workspace);
            }

            console.log("Blockly: initialization complete");
        } catch (e) {
            console.error("Blockly init-error:", e);
        }
    }

    configureCodeGenerator() {
        pythonGenerator.forBlock["start_block"] = function (block) {
            return "";
        };

        pythonGenerator.forBlock["print_block"] = function (block) {
            var text = pythonGenerator.valueToCode(block, "TEXT", pythonGenerator.ORDER_NONE) || '""';
            return "print(" + text + ")\n";
        };

        pythonGenerator.forBlock["import_lib_requests_block"] = function (block) {
            return "import requests\n";
        }
    }

    createStartBlock() {
        const startBlock = this.workspace.newBlock('start_block');
        startBlock.initSvg();
        startBlock.render();
        startBlock.moveBy(50, 30);
        startBlock.setDeletable(false);
        startBlock.setMovable(false);
    }

    saveWorkspaceState() {
        const stateToSave = Blockly.serialization.workspaces.save(this.workspace);
        this.state.setJsonBlocks(stateToSave);
    }

    generateAndUpdateCode() {
        const code = pythonGenerator.workspaceToCode(this.workspace);
        this.state.setGeneratedCode(code);
    }

    clearWorkspace() {
        this.workspace.clear();

        this.createStartBlock();
        this.saveWorkspaceState();
        this.generateAndUpdateCode();
    }

    loadWorkspaceState(blocksState) {
        this.workspace.clear();
        this.createStartBlock();
        if (blocksState) {
            Blockly.serialization.workspaces.load(blocksState, this.workspace);
        }
        this.saveWorkspaceState();
        this.generateAndUpdateCode();
    }
}
