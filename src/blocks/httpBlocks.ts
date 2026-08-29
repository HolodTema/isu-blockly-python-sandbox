import {PythonGenerator, Order} from "blockly/python";
import * as Blockly from "blockly";


export function initHttpBlocks(generator: PythonGenerator, mode: "display"|"execution") {
    generator.forBlock["import_lib_requests_block"] = function (block: Blockly.Block): string {
        return "import requests\n";
    };

    generator.forBlock["http_query_block"] = function (block: Blockly.Block): string {
        const queryKey = generator.valueToCode(block, "KEY", Order.ATOMIC) || "''";
        const queryValue = generator.valueToCode(block, "VALUE", Order.ATOMIC) || "''";
        return `${queryKey}: ${queryValue}`;
    };

    generator.forBlock["http_header_block"] = function (block: Blockly.Block): string {
        const headerName = generator.valueToCode(block, "NAME", Order.ATOMIC) || "''";
        const headerValue = generator.valueToCode(block, "VALUE", Order.ATOMIC) || "''";
        return `${headerName}: ${headerValue}`;
    };

    generator.forBlock["http_get_request_block"] = function (block: Blockly.Block): string {
        if (mode == "execution") {
//             const requestType = block.getFieldValue("REQUEST_TYPE");
//
//             let path = generator.valueToCode(block, "PATH", Order.ATOMIC) || `""`
//
//             if (path !== `""`) {
//                 path = `'http://130.49.175.150:8080/${path.substring(1, path.length)}`;
//             }
//             console.log(path);
//             let queryItems = [];
//             let queryBlock: Blockly.Block | null = block.getInputTargetBlock("QUERY");
//             while (queryBlock) {
//                 const queryItemCode = generator.blockToCode(queryBlock, true);
//                 console.log(queryItemCode);
//                 if (queryItemCode) {
//                     console.log("push");
//                     queryItems.push(queryItemCode);
//                 }
//                 if (queryBlock.nextConnection) {
//                     queryBlock = queryBlock.nextConnection.targetBlock();
//                 }
//             }
//             console.log(queryItems);
//
//             let headerItems = [];
//             let headerBlock = block.getInputTargetBlock("HEADERS");
//             while (headerBlock) {
//                 const headerItemCode = generator.blockToCode(headerBlock, true);
//                 if (headerItemCode) {
//                     headerItems.push(headerItemCode);
//                 }
//                 if (headerBlock.nextConnection) {
//                     headerBlock = headerBlock.nextConnection.targetBlock();
//                 }
//             }
//
//             const strRequestBody = generator.valueToCode(block, "REQUEST_BODY", Order.ATOMIC) || null;
//
//             const variableStatusCode = generator.valueToCode(block, "STATUS_CODE", Order.ATOMIC) || "status_code";
//             const variableResponseBody = generator.valueToCode(block, "RESPONSE_BODY", Order.ATOMIC) || "response_body";
//
//             let codeOnResponse = generator.statementToCode(block, "RESPONSE");
//             let codeOnTimeout = generator.statementToCode(block, "TIMEOUT");
//
//             const indentToTry = (code: string) => {
//                 if (!code) return "";
//                 return code.split("\n")
//                     .map(line => line ? "    " + line : line)
//                     .join("\n");
//             };
//             codeOnResponse = indentToTry(codeOnResponse);
//             codeOnTimeout = indentToTry(codeOnTimeout);
//
//             const queryDict = queryItems.length ? '{' + queryItems.join(', ') + '}' : '{}';
//             const headerDict = headerItems.length ? '{' + headerItems.join(', ') + '}' : '{}';
//             return `
// from pyodide.http import pyfetch
//
// async def do_request():
//     url = ${path}
//     params = ${queryDict}
//     headers = ${headerDict}
//     ${strRequestBody ? `request_body = ${strRequestBody}` : ''}
//
//     if params:
//         from urllib.parse import urlencode
//         url = url + '?' + urlencode(params)
//
//     try:
//         response = await pyfetch(url, method="${requestType}", headers=headers, ${strRequestBody ? 'body=request_body,' : ''} timeout=10)
//         ${variableStatusCode} = response.status
//         ${variableResponseBody} = await response.text()
// ${codeOnResponse}
//     except Exception as e:
//         print(e)
// ${codeOnTimeout}
//
// await do_request()
//                 `;
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

            let code = `
url = ${path}
if url != "":
    url = "http://130.49.175.150:8080/" + url
params = ${queryDict}
headers = ${headerDict}
`;
            if (strRequestBody) {
                code += `request_body = ${strRequestBody}\n`;
            }
            code += "try:\n";
            code += `    response = requests.request(method="${requestType}", url=url, params=params, headers=headers, ${strRequestBody ? 'data=request_body,' : ''} timeout=10)\n`;
            code += `    ${variableStatusCode} = response.status_code\n`;
            code += `    ${variableResponseBody} = response.text\n`;
            code += codeOnResponse;
            code += "except Exception as e:\n";
            code += codeOnTimeout;

            return code;

        } else if (mode == "display") {
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

            let code = "";
            code += `url = ${path}\n`;
            code += `params = ${queryDict}\n`;
            code += `headers = ${headerDict}\n`;
            if (strRequestBody) {
                code += `request_body = ${strRequestBody}\n`;
            }
            code += "try:\n";
            code += `    response = requests.request(method="${requestType}", url=url, params=params, headers=headers, ${strRequestBody ? 'data=request_body,' : ''} timeout=10)\n`;
            code += `    ${variableStatusCode} = response.status_code\n`;
            code += `    ${variableResponseBody} = response.text\n`;
            code += codeOnResponse;
            code += "except Exception as e:\n";
            code += codeOnTimeout;

            return code;
        }
        return "";
    };
}