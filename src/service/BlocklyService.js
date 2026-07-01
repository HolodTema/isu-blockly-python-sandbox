import * as Blockly from 'blockly';
import * as Ru from 'blockly/msg/ru';
import { pythonGenerator } from "blockly/python";
import { Order } from "blockly/python";
import {python} from "@codemirror/lang-python";

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
        pythonGenerator.INDENT = '    ';

        pythonGenerator.forBlock["start_block"] = function (block) {
            return "";
        };

        pythonGenerator.forBlock["custom_if_block"] = function (block) {
            let condition = pythonGenerator.valueToCode(block, "CONDITION", Order.ATOMIC) || "False";
            let codeInsideIf = pythonGenerator.statementToCode(block, "THEN");
            return `if ${condition}:\n${codeInsideIf}\n`;
        };

        pythonGenerator.forBlock["custom_if_else_block"] = function(block) {
            const condition = pythonGenerator.valueToCode(block, "CONDITION", Order.ATOMIC) || "False";
            const thenCode = pythonGenerator.statementToCode(block, "THEN");
            const elseCode = pythonGenerator.statementToCode(block, "ELSE");
            return `if ${condition}:\n${thenCode}else:\n${elseCode}\n`;
        };

        pythonGenerator.forBlock["custom_if_elif_else_block"] = function(block) {
            const cond1 = pythonGenerator.valueToCode(block, "COND1", Order.ATOMIC) || "False";
            const then1 = pythonGenerator.statementToCode(block, "THEN1");
            const cond2 = pythonGenerator.valueToCode(block, "COND2", Order.ATOMIC) || "False";
            const then2 = pythonGenerator.statementToCode(block, "THEN2");
            const elseCode = pythonGenerator.statementToCode(block, "ELSE");
            return `if ${cond1}:\n${then1}elif ${cond2}:\n${then2}else:\n${elseCode}\n`;
        };

        pythonGenerator.forBlock["text_file_open_block"] = function(block) {
            const filePath = block.getFieldValue("FILE_PATH");
            const fileMode = block.getFieldValue("MODE");
            const variableCode = pythonGenerator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
            return `${variableCode} = open("${filePath}", '${fileMode}')\n`;
        };

        pythonGenerator.forBlock["text_file_read_block"] = function (block) {
            const fileVariable = pythonGenerator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
            const code = `${fileVariable}.read()\n`;
            return [code, Order.FUNCTION_CALL];
        };

        pythonGenerator.forBlock["text_file_read_lines_block"] = function(block) {
            const fileVariable = pythonGenerator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
            const code = `${fileVariable}.readlines()\n`;
            return [code, Order.FUNCTION_CALL];
        };

        pythonGenerator.forBlock["text_file_write_to_end_block"] = function(block) {
            const fileVariable = pythonGenerator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
            const textToWrite = pythonGenerator.valueToCode(block, "TEXT_TO_WRITE", Order.ATOMIC) || "";
            return `${fileVariable}.write(${textToWrite})\n`;
        };

        pythonGenerator.forBlock["text_file_close_block"] = function(block) {
            const fileVariable = pythonGenerator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
            return `${fileVariable}.close()\n`;
        };

        pythonGenerator.forBlock["print_block"] = function (block) {
            const text = pythonGenerator.valueToCode(block, "TEXT", pythonGenerator.ORDER_NONE) || '""';
            return "print(" + text + ")\n";
        };

        pythonGenerator.forBlock["import_lib_requests_block"] = function (block) {
            return "import requests\n";
        };
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
        const allBlocks = this.workspace.getTopBlocks(false);
        const startBlock = allBlocks.find(block => block.type === "start_block");
        if (!startBlock) {

            console.error("Blockly: Error: there is no start_block on the workspace");

            return "";

        }
        pythonGenerator.init(this.workspace);
        let code = pythonGenerator.blockToCode(startBlock);
        code = pythonGenerator.finish(code).trim();
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
