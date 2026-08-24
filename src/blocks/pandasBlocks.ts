import {Order, PythonGenerator} from "blockly/python";
import * as Blockly from "blockly";


export function initPandasBlocks(generator: PythonGenerator, mode: "display"|"execution") {
    generator.forBlock["pandas_import_block"] = function(block: Blockly.Block): string {
        return "import pandas as pd\n";
    };

    generator.forBlock["pandas_read_html_block"] = function(block: Blockly.Block): [string, Order] {
        const blockArg = generator.valueToCode(block, "HTML_TEXT", Order.ATOMIC) || '""';
        if (mode == "display") {
            return [`pd.read_html(${blockArg})[0]`, Order.FUNCTION_CALL];
        }
        else {
            return [
                `await (async () => {
                let blockArg = ${blockArg};
                if (typeof blockArg === 'string' && (blockArg.startsWith('http://') || blockArg.startsWith('https://'))) {
                    const response = await pyodide.pyimport('pyodide.http').pyfetch(html);
                    blockArg = await response.text();
                }
                return pd.read_html(html)[0];
            })()`,
                Order.ATOMIC
            ];
        }
    };

    generator.forBlock["pandas_concat_block"] = function(block: Blockly.Block): [string, Order] {
        const listVar = generator.valueToCode(block, "LIST", Order.ATOMIC) || '[]';
        return [`pd.concat(${listVar})`, Order.FUNCTION_CALL];
    };

    generator.forBlock["pandas_head_n_block"] = function(block: Blockly.Block): [string, Order] {
        const df = generator.valueToCode(block, "DF", Order.ATOMIC) || '""';
        const n = generator.valueToCode(block, "N", Order.ATOMIC) || '5';
        return [`${df}.head(${n})`, Order.FUNCTION_CALL];
    };

    generator.forBlock["pandas_tail_n_block"] = function(block: Blockly.Block): [string, Order] {
        const df = generator.valueToCode(block, "DF", Order.ATOMIC) || '""';
        const n = generator.valueToCode(block, "N", Order.ATOMIC) || '5';
        return [`${df}.tail(${n})`, Order.FUNCTION_CALL];
    };

    generator.forBlock["pandas_append_to_list_block"] = function(block: Blockly.Block): string {
        const listVar = generator.valueToCode(block, "LIST", Order.ATOMIC) || '[]';
        const item = generator.valueToCode(block, "ITEM", Order.ATOMIC) || 'None';
        return `${listVar}.append(${item})\n`;
    };

    generator.forBlock["pandas_to_csv_block"] = function(block: Blockly.Block): string {
        const df = generator.valueToCode(block, "DF", Order.ATOMIC) || '""';
        const filePath = block.getFieldValue("FILE_PATH");
        return `${df}.to_csv("${filePath}", index=False)\n`;
    };

    generator.forBlock["pandas_info_block"] = function(block: Blockly.Block): string {
        const df = generator.valueToCode(block, "DF", Order.ATOMIC) || '""';
        return `${df}.info()\n`;
    };
}