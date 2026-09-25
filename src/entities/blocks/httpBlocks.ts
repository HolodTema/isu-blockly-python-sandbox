/**
 * Code generators for HTTP blocks: import requests library, query parameters,
 * headers and full HTTP request with response handling.
 *
 * All HTTP requests go through proxy which is patched in patchCode.py. Without
 * proxy requests from browser to other sites would fail because of CORS.
 */

import {PythonGenerator, Order} from "blockly/python";
import * as Blockly from "blockly";


/**
 * Registers Python generators for HTTP blocks on given generator instance.
 *
 * @param generator - Python generator which will get new block handlers.
 * @param mode - Current mode of generator. Not used right now.
 */
export function initHttpBlocks(generator: PythonGenerator, mode: "display"|"execution") {
    generator.forBlock["import_lib_requests_block"] = function (block: Blockly.Block): string {
        return "import requests\n";
    };

    /**
     * Generates single key-value pair for query parameters dictionary.
     *
     * This block is not standalone — it is connected to chain inside
     * `http_get_request_block`. Output looks like `'key': 'value'` without
     * braces, because braces are added by parent block.
     */
    generator.forBlock["http_query_block"] = function (block: Blockly.Block): string {
        const queryKey = generator.valueToCode(block, "KEY", Order.ATOMIC) || "''";
        const queryValue = generator.valueToCode(block, "VALUE", Order.ATOMIC) || "''";
        return `${queryKey}: ${queryValue}`;
    };

    /**
     * Generates single name-value pair for headers dictionary. Same note about
     * chaining as for query block.
     */
    generator.forBlock["http_header_block"] = function (block: Blockly.Block): string {
        const headerName = generator.valueToCode(block, "NAME", Order.ATOMIC) || "''";
        const headerValue = generator.valueToCode(block, "VALUE", Order.ATOMIC) || "''";
        return `${headerName}: ${headerValue}`;
    };

    /**
     * Generates full HTTP request with query, headers and response handling.
     *
     * Query parameters and headers are collected from chained blocks attached
     * to "QUERY" and "HEADERS" inputs. Because they are chains of statements
     * (not single blocks), we walk through `nextConnection` until chain ends.
     *
     * The actual call is wrapped in try/except:
     * - on success, status code and response body are saved into user variables
     *   and user code from "RESPONSE" container runs;
     * - on exception (timeout, network error), user code from "TIMEOUT" container
     *   runs.
     *
     * Timeout is hardcoded to 10 seconds. If this becomes a problem, the value
     * can be moved into a field later.
     */
    generator.forBlock["http_get_request_block"] = function (block: Blockly.Block): string {
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
    };
}
