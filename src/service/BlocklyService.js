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

        pythonGenerator.forBlock["text_join_block"] = function(block) {
            let textLeft = pythonGenerator.valueToCode(block, "TEXT_LEFT", Order.NONE) || "";
            if (textLeft.length > 0) {
                textLeft = textLeft.substring(1, textLeft.length - 1);
            }

            let textRight = pythonGenerator.valueToCode(block, "TEXT_RIGHT", Order.NONE) || "";
            if (textRight.length > 0) {
                textRight = textRight.substring(1, textRight.length - 1);
            }

            const code = `"${textLeft}${textRight}"`;
            return [code, Order.FUNCTION_CALL];
        }

        pythonGenerator.forBlock["print_block"] = function (block) {
            const text = pythonGenerator.valueToCode(block, "TEXT", Order.NONE) || '""';
            return "print(" + text + ")\n";
        };

        pythonGenerator.forBlock["import_lib_requests_block"] = function (block) {
            return "import requests\n";
        };

        pythonGenerator.forBlock["http_query_block"] = function (block) {
            const queryKey = pythonGenerator.valueToCode(block, "KEY", Order.ATOMIC) || "";
            const queryValue = pythonGenerator.valueToCode(block, "VALUE", Order.ATOMIC) || "";
            return `${queryKey}=${queryValue}`;
        };

        pythonGenerator.forBlock["http_header_block"] = function (block) {
            const headerName = pythonGenerator.valueToCode(block, "NAME", Order.ATOMIC) || "";
            const headerValue = pythonGenerator.valueToCode(block, "VALUE", Order.ATOMIC) || "";
            return `${headerName}: ${headerValue}`;
        };

        pythonGenerator.forBlock["http_get_request_block"] = function (block) {
            const path = pythonGenerator.valueToCode(block, "PATH", Order.ATOMIC) || `""`

            let queryItems = [];
            let queryBlock = block.getInputTargetBlock("QUERY");
            while (queryBlock) {
                const queryItemCode = pythonGenerator.blockToCode(queryBlock);
                if (queryItemCode) {
                    queryItems.push(queryItemCode[0]);
                }
                queryBlock = queryBlock.nextConnection
                if (queryBlock) {
                    queryBlock = queryBlock.targetBlock();
                }
            }

            let headerItems = [];
            let headerBlock = block.getInputTargetBlock("HEADERS");
            while (headerBlock) {
                const headerItemCode = pythonGenerator.blockToCode(headerBlock);
                if (headerItemCode) {
                    headerItems.push(headerItemCode[0]);
                }
                headerBlock = headerBlock.nextConnection;
                if (headerBlock) {
                    headerBlock = headerBlock.targetBlock();
                }
            }

            const variableStatusCode = pythonGenerator.valueToCode(block, "STATUS_CODE", Order.ATOMIC) || "status_code";
            const variableResponseBody = pythonGenerator.valueToCode(block, "RESPONSE_BODY", Order.ATOMIC) || "response_body";

            const codeOnResponse = pythonGenerator.statementToCode(block, "RESPONSE");
            const codeOnTimeout = pythonGenerator.statementToCode(block, "TIMEOUT");

            var queryList = queryItems.length ? '[' + queryItems.join(', ') + ']' : '[]';
            var headerList = headerItems.length ? '[' + headerItems.join(', ') + ']' : '[]';

            var code = `
import asyncio
from pyodide.http import pyfetch

async def _http_get():
    url = ${path}
    status_var = ${variableStatusCode}
    body_var = ${variableResponseBody}

    query_parts = ${queryList}
    header_parts = ${headerList}

    params = {}
    for part in query_parts:
        if '=' in part:
            k, v = part.split('=', 1)
            params[k] = v

    headers = {}
    for part in header_parts:
        if ': ' in part:
            k, v = part.split(': ', 1)
            headers[k] = v

    try:
        response = await asyncio.wait_for(
            pyfetch(url, method='GET', headers=headers, params=params), 
            timeout=10
        )
        body = await response.text()
        status = response.status

        # Сохраняем в глобальные переменные (доступны в Blockly)
        globals()[status_var] = status
        globals()[body_var] = body

        # Выполняем блок "при успехе"
        ${codeOnResponse}

    except asyncio.TimeoutError:
        # Выполняем блок "при таймауте"
        ${codeOnTimeout}

# Запускаем асинхронную функцию
asyncio.ensure_future(_http_get())
`;

            return code;
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
