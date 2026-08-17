import * as Blockly from 'blockly';
import * as Ru from 'blockly/msg/ru';
import {pythonGenerator, PythonGenerator} from "blockly/python";
import {Order} from "blockly/python";
import {AppState} from "../state/AppState";
import {WorkspaceSvg} from "blockly";

export class BlocklyService {
    private workspace: WorkspaceSvg | undefined = undefined;
    private codeToLaunchGenerator: PythonGenerator;
    private codeToShowGenerator: PythonGenerator;
    private resizeObserver: ResizeObserver | undefined = undefined;

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

            Blockly.setLocale(Ru);

            this.workspace = Blockly.inject(this.htmlContainerId, {
                toolbox: jsonToolbox,
                grid: {spacing: 20, length: 3, colour: '#ccc', snap: true},
                zoom: {controls: true, wheel: true, startScale: 1.2},
                trashcan: false
            });

            const originalForBlockFunctions = pythonGenerator.forBlock;
            Object.assign(this.codeToLaunchGenerator.forBlock, originalForBlockFunctions);
            Object.assign(this.codeToShowGenerator.forBlock, originalForBlockFunctions);
            this.configureCodeGenerator(this.codeToLaunchGenerator, "execution")
            this.configureCodeGenerator(this.codeToShowGenerator, "display")

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
        } catch (e) {
            console.error("Blockly init-error:", e);
        }
    }

    private configureCodeGenerator(generator: PythonGenerator, mode: "display" | "execution") {
        generator.INDENT = "    ";

        generator.forBlock["start_block"] = function (block) {
            return "";
        };

        generator.forBlock["custom_if_block"] = function (block) {
            let condition = generator.valueToCode(block, "CONDITION", Order.ATOMIC) || "False";
            let codeInsideIf = generator.statementToCode(block, "THEN");
            return `if ${condition}:\n${codeInsideIf}\n`;
        };

        generator.forBlock["custom_if_else_block"] = function (block) {
            const condition = generator.valueToCode(block, "CONDITION", Order.ATOMIC) || "False";
            const thenCode = generator.statementToCode(block, "THEN");
            const elseCode = generator.statementToCode(block, "ELSE");
            return `if ${condition}:\n${thenCode}else:\n${elseCode}\n`;
        };

        generator.forBlock["custom_if_elif_else_block"] = function (block) {
            const cond1 = generator.valueToCode(block, "COND1", Order.ATOMIC) || "False";
            const then1 = generator.statementToCode(block, "THEN1");
            const cond2 = generator.valueToCode(block, "COND2", Order.ATOMIC) || "False";
            const then2 = generator.statementToCode(block, "THEN2");
            const elseCode = generator.statementToCode(block, "ELSE");
            return `if ${cond1}:\n${then1}elif ${cond2}:\n${then2}else:\n${elseCode}\n`;
        };

        generator.forBlock["text_file_open_block"] = function (block) {
            const filePath = block.getFieldValue("FILE_PATH");
            const fileMode = block.getFieldValue("MODE");
            const variableCode = generator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
            return `${variableCode} = open("${filePath}", '${fileMode}')\n`;
        };

        generator.forBlock["text_file_read_block"] = function (block) {
            const fileVariable = generator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
            const code = `${fileVariable}.read()`;
            return [code, Order.FUNCTION_CALL];
        };

        generator.forBlock["text_file_read_lines_block"] = function (block) {
            const fileVariable = generator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
            const code = `${fileVariable}.readlines()`;
            return [code, Order.FUNCTION_CALL];
        };

        generator.forBlock["text_file_write_to_end_block"] = function (block) {
            const fileVariable = generator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
            const textToWrite = generator.valueToCode(block, "TEXT_TO_WRITE", Order.ATOMIC) || "";
            return `${fileVariable}.write(${textToWrite})\n`;
        };

        generator.forBlock["text_file_close_block"] = function (block) {
            const fileVariable = generator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
            return `${fileVariable}.close()\n`;
        };

        generator.forBlock["text_join_block"] = function (block) {
            let textLeft = generator.valueToCode(block, "TEXT_LEFT", Order.NONE) || "";
            if (textLeft.length > 0) {
                textLeft = textLeft.substring(1, textLeft.length - 1);
            }

            let textRight = generator.valueToCode(block, "TEXT_RIGHT", Order.NONE) || "";
            if (textRight.length > 0) {
                textRight = textRight.substring(1, textRight.length - 1);
            }

            const code = `"${textLeft}${textRight}"`;
            return [code, Order.FUNCTION_CALL];
        }

        generator.forBlock["print_block"] = function (block) {
            const text = generator.valueToCode(block, "TEXT", Order.NONE) || '""';
            return "print(" + text + ")\n";
        };

        generator.forBlock["import_lib_requests_block"] = function (block) {
            return "import requests\n";
        };

        generator.forBlock["http_query_block"] = function (block) {
            const queryKey = generator.valueToCode(block, "KEY", Order.ATOMIC) || "''";
            const queryValue = generator.valueToCode(block, "VALUE", Order.ATOMIC) || "''";
            return `${queryKey}: ${queryValue}`;
        };

        generator.forBlock["http_header_block"] = function (block) {
            const headerName = generator.valueToCode(block, "NAME", Order.ATOMIC) || "''";
            const headerValue = generator.valueToCode(block, "VALUE", Order.ATOMIC) || "''";
            return `${headerName}: ${headerValue}`;
        };

        generator.forBlock["http_get_request_block"] = function (block) {
            if (mode == "execution") {
                const requestType = block.getFieldValue("REQUEST_TYPE");

                let path = generator.valueToCode(block, "PATH", Order.ATOMIC) || `""`

                if (path !== `""`) {
                    path = `'http://130.49.175.150:8080/${path.substring(1, path.length)}`;
                }
                console.log(path);
                let queryItems = [];
                let queryBlock: Blockly.Block | null = block.getInputTargetBlock("QUERY");
                while (queryBlock) {
                    const queryItemCode = generator.blockToCode(queryBlock, true);
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
                    const headerItemCode = generator.blockToCode(headerBlock, true);
                    if (headerItemCode) {
                        headerItems.push(headerItemCode);
                    }
                    if (headerBlock.nextConnection) {
                        headerBlock = headerBlock.nextConnection.targetBlock();
                    }
                }

                const strRequestBody = generator.valueToCode(block, "REQUEST_BODY", Order.ATOMIC) || null;

                const variableStatusCode = generator.valueToCode(block, "STATUS_CODE", Order.ATOMIC) || "status_code";
                const variableResponseBody = generator.valueToCode(block, "RESPONSE_BODY", Order.ATOMIC) || "response_body";

                let codeOnResponse = generator.statementToCode(block, "RESPONSE");
                let codeOnTimeout = generator.statementToCode(block, "TIMEOUT");

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
            } else if (mode == "display") {
                generator.forBlock["http_get_request_block"] = function(block) {
                    const requestType = block.getFieldValue("REQUEST_TYPE");
                    let path = generator.valueToCode(block, "PATH", Order.ATOMIC) || `""`;

                    let queryItems = [];
                    let queryBlock = block.getInputTargetBlock("QUERY");
                    while (queryBlock) {
                        const queryItemCode = generator.blockToCode(queryBlock, true);
                        if (queryItemCode) queryItems.push(queryItemCode);
                        if (queryBlock.nextConnection) {
                            queryBlock = queryBlock.nextConnection.targetBlock();
                        }
                    }
                    const queryDict = queryItems.length ? '{' + queryItems.join(', ') + '}' : '{}';

                    let headerItems = [];
                    let headerBlock = block.getInputTargetBlock("HEADERS");
                    while (headerBlock) {
                        const headerItemCode = generator.blockToCode(headerBlock, true);
                        if (headerItemCode) headerItems.push(headerItemCode);
                        if (headerBlock.nextConnection) {
                            headerBlock = headerBlock.nextConnection.targetBlock();
                        }
                    }
                    const headerDict = headerItems.length ? '{' + headerItems.join(', ') + '}' : '{}';

                    const strRequestBody = generator.valueToCode(block, "REQUEST_BODY", Order.ATOMIC) || null;
                    const variableStatusCode = generator.valueToCode(block, "STATUS_CODE", Order.ATOMIC) || "status_code";
                    const variableResponseBody = generator.valueToCode(block, "RESPONSE_BODY", Order.ATOMIC) || "response_body";

                    let codeOnResponse = generator.statementToCode(block, "RESPONSE");
                    let codeOnTimeout = generator.statementToCode(block, "TIMEOUT");

                    const indent = (code: string) => {
                        if (!code) return "";
                        return code.split("\n")
                            .map(line => line ? "    " + line : line)
                            .join("\n");
                    };
                    const codeOnResponseIndented = indent(codeOnResponse);
                    const codeOnTimeoutIndented = indent(codeOnTimeout);

                    let code = "import requests\n\n";
                    code += "def do_request():\n";
                    code += `    url = ${path}\n`;
                    code += `    params = ${queryDict}\n`;
                    code += `    headers = ${headerDict}\n`;
                    if (strRequestBody) {
                        code += `    request_body = ${strRequestBody}\n`;
                    }
                    code += "    try:\n";
                    code += `        response = requests.request(method="${requestType}", url=url, params=params, headers=headers, ${strRequestBody ? 'data=request_body,' : ''} timeout=10)\n`;
                    code += `        ${variableStatusCode} = response.status_code\n`;
                    code += `        ${variableResponseBody} = response.text\n`;
                    code += codeOnResponseIndented;
                    code += "    except Exception as e:\n";
                    code += codeOnTimeoutIndented;
                    code += "\ndo_request()\n";

                    return code;
                };
            }
            return "";
        };

        generator.forBlock["pandas_import_block"] = function (block) {
            return "import pandas as pd\n";
        };

        generator.forBlock["pandas_read_html_block"] = function (block) {
            const htmlText = generator.valueToCode(block, "HTML_TEXT", Order.ATOMIC) || '""';
            return [`pd.read_html(${htmlText})[0]`, Order.FUNCTION_CALL];
        };

        generator.forBlock["pandas_concat_block"] = function (block) {
            const listVar = generator.valueToCode(block, "LIST", Order.ATOMIC) || '[]';
            return [`pd.concat(${listVar})`, Order.FUNCTION_CALL];
        };

        generator.forBlock["pandas_head_n_block"] = function (block) {
            const df = generator.valueToCode(block, "DF", Order.ATOMIC) || '""';
            const n = generator.valueToCode(block, "N", Order.ATOMIC) || '5';
            return [`${df}.head(${n})`, Order.FUNCTION_CALL];
        };

        generator.forBlock["pandas_tail_n_block"] = function (block) {
            const df = generator.valueToCode(block, "DF", Order.ATOMIC) || '""';
            const n = generator.valueToCode(block, "N", Order.ATOMIC) || '5';
            return [`${df}.tail(${n})`, Order.FUNCTION_CALL];
        };

        generator.forBlock["pandas_append_to_list_block"] = function (block) {
            const listVar = generator.valueToCode(block, "LIST", Order.ATOMIC) || '[]';
            const item = generator.valueToCode(block, "ITEM", Order.ATOMIC) || 'None';
            return `${listVar}.append(${item})\n`;
        };

        generator.forBlock["pandas_to_csv_block"] = function (block) {
            const df = generator.valueToCode(block, "DF", Order.ATOMIC) || '""';
            const filePath = block.getFieldValue("FILE_PATH");
            return `${df}.to_csv("${filePath}", index=False)\n`;
        };

        generator.forBlock["pandas_info_block"] = function (block) {
            const df = generator.valueToCode(block, "DF", Order.ATOMIC) || '""';
            return `${df}.info()\n`;
        };

        generator.forBlock["convert_to_int_block"] = function (block) {
            const valueToConvert = generator.valueToCode(block, "VALUE_TO_CONVERT", Order.ATOMIC) || "";
            return [`int(${valueToConvert})`, Order.FUNCTION_CALL];
        }

        generator.forBlock["convert_to_str_block"] = function (block) {
            const valueToConvert = generator.valueToCode(block, "VALUE_TO_CONVERT", Order.ATOMIC) || "";
            return [`str(${valueToConvert})`, Order.FUNCTION_CALL];
        }

        generator.forBlock["convert_to_float_block"] = function (block) {
            const valueToConvert = generator.valueToCode(block, "VALUE_TO_CONVERT", Order.ATOMIC) || "";
            return [`float(${valueToConvert})`, Order.FUNCTION_CALL];
        }

        generator.forBlock["convert_to_bool_block"] = function (block) {
            const valueToConvert = generator.valueToCode(block, "VALUE_TO_CONVERT", Order.ATOMIC) || "";
            return [`bool(${valueToConvert})`, Order.FUNCTION_CALL];
        }

        generator.forBlock["comment_block"] = function (block) {
            const commentText = block.getFieldValue("COMMENT_TEXT");
            return `# ${commentText}\n`;
        }
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

        this.codeToLaunchGenerator.init(this.workspace!);
        let codeToLaunch = this.codeToLaunchGenerator.blockToCode(startBlock) as string;
        codeToLaunch = this.codeToLaunchGenerator.finish(codeToLaunch)?.trim();
        this.state.setStrCodeToLaunch(codeToLaunch);

        this.codeToShowGenerator.init(this.workspace!);
        let codeToShow = this.codeToShowGenerator.blockToCode(startBlock) as string;
        codeToShow = this.codeToShowGenerator.finish(codeToShow)?.trim();
        this.state.setStrCodeToShow(codeToShow);
    }

    private clearWorkspace() {
        this.workspace!.clear();
        this.createStartBlock();
        this.saveWorkspaceState();
        this.generateAndUpdateCode();
    }

    loadWorkspaceState(blocksState: { [p: string]: any }) {
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
