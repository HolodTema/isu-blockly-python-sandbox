import {Order, PythonGenerator} from "blockly/python";
import * as Blockly from "blockly";


export function initPandasBlocks(generator: PythonGenerator, mode: "display"|"execution") {
    generator.forBlock["pandas_import_block"] = function(block: Blockly.Block): string {
        return "import pandas as pd\n";
    };

    generator.forBlock["pandas_read_html_block"] = function(block: Blockly.Block): string {
        const blockArg = generator.valueToCode(block, "TEXT_WITH_TABLE", Order.ATOMIC) || '""';
        const resultVarId = block.getFieldValue("RESULT_VAR");
        const resultVar = generator.getVariableName(resultVarId) || "df";
        return `${resultVar} = pd.read_html(${blockArg})[0]\n`;
    };

    generator.forBlock["pandas_read_json_block"] = function(block: Blockly.Block): string {
        const blockArg = generator.valueToCode(block, "TEXT_WITH_TABLE", Order.ATOMIC) || '""';
        const orient = block.getFieldValue("ORIENT") || "records";
        const resultVarId = block.getFieldValue("RESULT_VAR");
        const resultVar = generator.getVariableName(resultVarId) || "df";
        return `${resultVar} = pd.read_json(${blockArg}, orient="${orient}")\n`;
    };

    generator.forBlock["pandas_read_csv_block"] = function(block: Blockly.Block): string {
        const blockArg = generator.valueToCode(block, "TEXT_WITH_TABLE", Order.ATOMIC) || '""';
        const sep = block.getFieldValue("SEP") || ",";
        const resultVarId = block.getFieldValue("RESULT_VAR");
        const resultVar = generator.getVariableName(resultVarId) || "df";
        return `${resultVar} = pd.read_csv(${blockArg}, sep="${sep}")\n`;
    }

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

    function parseColumns(raw: string): string[] {
        return raw
            .split(',')
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
    }

    function columnsToPythonList(columns: string[]): string {
        return '[' + columns.map((c) => `"${c}"`).join(', ') + ']';
    }

    generator.forBlock["pandas_select_columns_block"] = function (block: Blockly.Block): [string, Order] {
        const dfVarId = block.getFieldValue("DF");
        const dfVar = generator.getVariableName(dfVarId) || "df";
        const columnsStr = block.getFieldValue("COLUMNS") || '';
        const columns = parseColumns(columnsStr);
        if (columns.length === 0) {
            return [`${dfVar}[[]]`, Order.FUNCTION_CALL];
        }
        return [`${dfVar}[${columnsToPythonList(columns)}]`, Order.FUNCTION_CALL];
    };

    generator.forBlock["pandas_drop_columns_block"] = function (block: Blockly.Block): [string, Order] {
        const dfVarId = block.getFieldValue("DF");
        const dfVar = generator.getVariableName(dfVarId) || "df";
        const columnsStr = block.getFieldValue("COLUMNS") || '';
        const columns = parseColumns(columnsStr);
        if (columns.length === 0) {
            return [dfVar, Order.ATOMIC];
        }
        return [`${dfVar}.drop(columns=${columnsToPythonList(columns)})`, Order.FUNCTION_CALL];
    };
}
