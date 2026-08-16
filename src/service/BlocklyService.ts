import * as Blockly from 'blockly';
import * as Ru from 'blockly/msg/ru';
import {PythonGenerator, pythonGenerator} from "blockly/python";
import { Order } from "blockly/python";
import {AppState} from "../state/AppState";
import {WorkspaceSvg} from "blockly";

export class BlocklyService {
    private workspace: WorkspaceSvg|undefined = undefined;
    private codeToLaunchGenerator: PythonGenerator;
    private codeToShowGenerator: PythonGenerator;
    private resizeObserver: ResizeObserver|undefined = undefined;

    constructor(private state: AppState, private htmlContainerId: string) {
        this.codeToLaunchGenerator = new PythonGenerator("Python");
        this.codeToShowGenerator = new PythonGenerator("Python");
        this.init();
    }

    async init() {
        try {
            const jsonBlocks = await fetch("/assets/blockly/blocks.json")
                .then(r => r.json());
            Blockly.defineBlocksWithJsonArray(jsonBlocks);

            const jsonToolbox = await fetch("/assets/blockly/toolbox.json")
                .then(r => r.json());

            // Blockly.setLocale(Ru);

            this.workspace = Blockly.inject(this.htmlContainerId, {
                toolbox: jsonToolbox,
                grid: {spacing: 20, length: 3, colour: '#ccc', snap: true},
                zoom: {controls: true, wheel: true, startScale: 1.2},
                trashcan: false
            });

            this.configureG

            this.configureCodeGenerator();

            this.createStartBlock();

            this.workspace.addChangeListener((event) => {
                if (event.isUiEvent) {
                    return;
                }

                this.saveWorkspaceState();
                // for auto-update code when blockly workspace is changed
                // this.generateAndUpdateCode();
            });

            const jsonBlocklyState = this.state.getJsonBlocklyState();
            if (jsonBlocklyState) {
                Blockly.serialization.workspaces.load(jsonBlocklyState, this.workspace);
            }
            console.log("Blockly: initialization complete");

            this.resizeObserver = new ResizeObserver(() => {
                this.workspace?.resize();
            });
            const container = document.getElementById(this.htmlContainerId);
            if (container) {
                this.resizeObserver.observe(container);
            }
        }
        catch (e) {
            console.error("Blockly init-error:", e);
        }
    }

    private configureCodeGenerator() {
        pythonGenerator.INDENT = "    ";

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
            const code = `${fileVariable}.read()`;
            return [code, Order.FUNCTION_CALL];
        };

        pythonGenerator.forBlock["text_file_read_lines_block"] = function(block) {
            const fileVariable = pythonGenerator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
            const code = `${fileVariable}.readlines()`;
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
            const queryKey = pythonGenerator.valueToCode(block, "KEY", Order.ATOMIC) || "''";
            const queryValue = pythonGenerator.valueToCode(block, "VALUE", Order.ATOMIC) || "''";
            return `${queryKey}: ${queryValue}`;
        };

        pythonGenerator.forBlock["http_header_block"] = function (block) {
            const headerName = pythonGenerator.valueToCode(block, "NAME", Order.ATOMIC) || "''";
            const headerValue = pythonGenerator.valueToCode(block, "VALUE", Order.ATOMIC) || "''";
            return `${headerName}: ${headerValue}`;
        };

        pythonGenerator.forBlock["http_get_request_block"] = function (block) {
            const requestType = block.getFieldValue("REQUEST_TYPE");

            let path = pythonGenerator.valueToCode(block, "PATH", Order.ATOMIC) || `""`

            if (path !== `""`) {
                path = `'http://130.49.175.150:8080/${path.substring(1, path.length)}`;
            }
            console.log(path);
            let queryItems = [];
            let queryBlock: Blockly.Block|null = block.getInputTargetBlock("QUERY");
            while (queryBlock) {
                const queryItemCode = pythonGenerator.blockToCode(queryBlock, true);
                console.log(queryItemCode);
                if (queryItemCode) {
                    console.log("push");
                    queryItems.push(queryItemCode);
                }
                if (queryBlock.nextConnection) {
                    queryBlock = queryBlock.nextConnection.targetBlock();
                }
            }
            console.log(queryItems);

            let headerItems = [];
            let headerBlock = block.getInputTargetBlock("HEADERS");
            while (headerBlock) {
                const headerItemCode = pythonGenerator.blockToCode(headerBlock, true);
                if (headerItemCode) {
                    headerItems.push(headerItemCode);
                }
                if (headerBlock.nextConnection) {
                    headerBlock = headerBlock.nextConnection.targetBlock();
                }
            }

            const strRequestBody = pythonGenerator.valueToCode(block, "REQUEST_BODY", Order.ATOMIC) || null;

            const variableStatusCode = pythonGenerator.valueToCode(block, "STATUS_CODE", Order.ATOMIC) || "status_code";
            const variableResponseBody = pythonGenerator.valueToCode(block, "RESPONSE_BODY", Order.ATOMIC) || "response_body";

            let codeOnResponse = pythonGenerator.statementToCode(block, "RESPONSE");
            let codeOnTimeout = pythonGenerator.statementToCode(block, "TIMEOUT");

            const indentToTry = (code: string) => {
                if (!code) return "";
                return code.split("\n")
                    .map(line => line ? "    " + line : line)
                    .join("\n");
            };
            codeOnResponse = indentToTry(codeOnResponse);
            codeOnTimeout = indentToTry(codeOnTimeout);

            const queryDict = queryItems.length ? '{' + queryItems.join(', ') + '}' : '{}';
            const headerDict = headerItems.length ? '{' + headerItems.join(', ') + '}' : '{}';

            return `
from pyodide.http import pyfetch

async def do_request():
    url = ${path}
    params = ${queryDict}
    headers = ${headerDict}
    ${strRequestBody ? `request_body = ${strRequestBody}` : ''}

    if params:
        from urllib.parse import urlencode
        url = url + '?' + urlencode(params)

    try:
        response = await pyfetch(url, method="${requestType}", headers=headers, ${strRequestBody ? 'body=request_body,' : ''} timeout=10)
        ${variableStatusCode} = response.status
        ${variableResponseBody} = await response.text()
${codeOnResponse}
    except Exception as e:
${codeOnTimeout}

await do_request()
            `;
        };

        pythonGenerator.forBlock["pandas_import_block"] = function(block) {
            return "import pandas as pd\n";
        };

        pythonGenerator.forBlock["pandas_read_html_block"] = function(block) {
            const htmlText = pythonGenerator.valueToCode(block, "HTML_TEXT", Order.ATOMIC) || '""';
            return [`pd.read_html(${htmlText})[0]`, Order.FUNCTION_CALL];
        };

        pythonGenerator.forBlock["pandas_concat_block"] = function(block) {
            const listVar = pythonGenerator.valueToCode(block, "LIST", Order.ATOMIC) || '[]';
            return [`pd.concat(${listVar})`, Order.FUNCTION_CALL];
        };

        pythonGenerator.forBlock["pandas_head_n_block"] = function(block) {
            const df = pythonGenerator.valueToCode(block, "DF", Order.ATOMIC) || '""';
            const n = pythonGenerator.valueToCode(block, "N", Order.ATOMIC) || '5';
            return [`${df}.head(${n})`, Order.FUNCTION_CALL];
        };

        pythonGenerator.forBlock["pandas_tail_n_block"] = function(block) {
            const df = pythonGenerator.valueToCode(block, "DF", Order.ATOMIC) || '""';
            const n = pythonGenerator.valueToCode(block, "N", Order.ATOMIC) || '5';
            return [`${df}.tail(${n})`, Order.FUNCTION_CALL];
        };

        pythonGenerator.forBlock["pandas_append_to_list_block"] = function(block) {
            const listVar = pythonGenerator.valueToCode(block, "LIST", Order.ATOMIC) || '[]';
            const item = pythonGenerator.valueToCode(block, "ITEM", Order.ATOMIC) || 'None';
            return `${listVar}.append(${item})\n`;
        };

        pythonGenerator.forBlock["pandas_to_csv_block"] = function(block) {
            const df = pythonGenerator.valueToCode(block, "DF", Order.ATOMIC) || '""';
            const filePath = block.getFieldValue("FILE_PATH");
            return `${df}.to_csv("${filePath}", index=False)\n`;
        };

        pythonGenerator.forBlock["pandas_info_block"] = function(block) {
            const df = pythonGenerator.valueToCode(block, "DF", Order.ATOMIC) || '""';
            return `${df}.info()\n`;
        };
    }

    private createStartBlock() {
        const startBlock = this.workspace!.newBlock("start_block");
        startBlock.initSvg();
        startBlock.render();
        startBlock.moveBy(50, 30);
        startBlock.setDeletable(false);
        startBlock.setMovable(false);
    }

    saveWorkspaceState() {
        const stateToSave = Blockly.serialization.workspaces.save(this.workspace!);
        this.state.setJsonBlocklyState(stateToSave);
    }

    generateAndUpdateCode() {
        const allBlocks = this.workspace!.getTopBlocks(false);
        const startBlock = allBlocks.find(block => block.type === "start_block");
        if (!startBlock) {
            console.error("Blockly: Error: there is no start_block on the workspace");
            return;
        }
        pythonGenerator.init(this.workspace!);
        let code = pythonGenerator.blockToCode(startBlock) as string;
        code = pythonGenerator.finish(code)?.trim();
        this.state.setStrGeneratedCode(code);
    }

    private clearWorkspace() {
        this.workspace!.clear();
        this.createStartBlock();
        this.saveWorkspaceState();
        this.generateAndUpdateCode();
    }

    loadWorkspaceState(blocksState: {[p: string]: any}) {
        this.workspace!.clear();
        this.createStartBlock();
        if (blocksState) {
            Blockly.serialization.workspaces.load(blocksState, this.workspace!);
        }
        this.saveWorkspaceState();
        this.generateAndUpdateCode();
    }

    resizeWorkspace() {
        if (this.workspace) {
            console.log("resize!");
            this.workspace.resize();
        }
    }
}
