/**
 * Code generators for pandas blocks: import, reading tables from different
 * sources, simple transformations and saving results to file.
 *
 * All read blocks save result into variable chosen by user. Variable is stored
 * in `field_variable` field, so to get real name we use `generator.getVariableName`
 * instead of reading field value directly (field value is variable id, not name).
 */

import {Order, PythonGenerator} from "blockly/python";
import * as Blockly from "blockly";


/**
 * Registers Python generators for pandas blocks on given generator instance.
 *
 * @param generator - Python generator which will get new block handlers.
 * @param mode - Current mode of generator. Not used right now.
 */
export function initPandasBlocks(generator: PythonGenerator, mode: "display"|"execution") {
    generator.forBlock["pandas_import_block"] = function(block: Blockly.Block): string {
        return "import pandas as pd\n";
    };

    /**
     * Reads first HTML table from string or URL into variable.
     *
     * `pd.read_html` returns list of all tables found on page, so we take
     * `[0]` to get first one. If page has no tables, this will raise IndexError
     * in Python — user should check their input.
     */
    generator.forBlock["pandas_read_html_block"] = function(block: Blockly.Block): string {
        const blockArg = generator.valueToCode(block, "TEXT_WITH_TABLE", Order.ATOMIC) || '""';
        const resultVarId = block.getFieldValue("RESULT_VAR");
        const resultVar = generator.getVariableName(resultVarId) || "df";
        return `${resultVar} = pd.read_html(${blockArg})[0]\n`;
    };

    /**
     * Reads JSON table from string or URL into variable.
     *
     * Orientation is taken from dropdown and passed as `orient` argument to
     * pandas. Most common value is "records" for list of objects.
     */
    generator.forBlock["pandas_read_json_block"] = function(block: Blockly.Block): string {
        const blockArg = generator.valueToCode(block, "TEXT_WITH_TABLE", Order.ATOMIC) || '""';
        const orient = block.getFieldValue("ORIENT") || "records";
        const resultVarId = block.getFieldValue("RESULT_VAR");
        const resultVar = generator.getVariableName(resultVarId) || "df";
        return `${resultVar} = pd.read_json(${blockArg}, orient="${orient}")\n`;
    };

    /**
     * Reads CSV table from string or URL into variable with given separator.
     */
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

    /**
     * Returns first N rows of DataFrame. N comes from connected number block.
     *
     * Important: input name is "PandasDataFrame" (same as block output check),
     * not "DF". If you rename it here, also update blocks.json.
     */
    generator.forBlock["pandas_head_n_block"] = function(block: Blockly.Block): [string, Order] {
        const df = generator.valueToCode(block, "PandasDataFrame", Order.ATOMIC) || 'df';
        const n = generator.valueToCode(block, "N", Order.ATOMIC) || '5';
        return [`${df}.head(${n})`, Order.FUNCTION_CALL];
    };

    /**
     * Returns last N rows of DataFrame. Same naming note as for head block.
     */
    generator.forBlock["pandas_tail_n_block"] = function(block: Blockly.Block): [string, Order] {
        const df = generator.valueToCode(block, "PandasDataFrame", Order.ATOMIC) || 'df';
        const n = generator.valueToCode(block, "N", Order.ATOMIC) || '5';
        return [`${df}.tail(${n})`, Order.FUNCTION_CALL];
    };

    generator.forBlock["pandas_append_to_list_block"] = function(block: Blockly.Block): string {
        const listVar = generator.valueToCode(block, "LIST", Order.ATOMIC) || '[]';
        const item = generator.valueToCode(block, "ITEM", Order.ATOMIC) || 'None';
        return `${listVar}.append(${item})\n`;
    };

    /**
     * Saves DataFrame to CSV file without index column.
     *
     * `index=False` is important: without it pandas adds extra column with row
     * numbers which usually confuses students.
     */
    generator.forBlock["pandas_to_csv_block"] = function(block: Blockly.Block): string {
        const df = generator.valueToCode(block, "DF", Order.ATOMIC) || '""';
        const filePath = block.getFieldValue("FILE_PATH");
        return `${df}.to_csv("${filePath}", index=False)\n`;
    };

    generator.forBlock["pandas_info_block"] = function(block: Blockly.Block): string {
        const df = generator.valueToCode(block, "DF", Order.ATOMIC) || '""';
        return `${df}.info()\n`;
    };

    /**
     * Parses string with comma-separated column names into array.
     *
     * User types names into plain text field, so we have to split them manually.
     * Spaces around each name are trimmed, empty parts are skipped — this makes
     * input more forgiving: "Age, Cabin ,  HomePlanet," works same as
     * "Age,Cabin,HomePlanet".
     *
     * @internal — used only inside {@link initPandasBlocks}.
     */
    function parseColumns(raw: string): string[] {
        return raw
            .split(',')
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
    }

    /**
     * Converts array of column names into Python list literal.
     *
     * Every name is wrapped in double quotes. We do not escape quotes inside names,
     * because column names in pandas usually do not contain them. If this becomes
     * a problem (someone has `"` in column name), escaping has to be added here.
     *
     * @internal — used only inside {@link initPandasBlocks}.
     */
    function columnsToPythonList(columns: string[]): string {
        return '[' + columns.map((c) => `"${c}"`).join(', ') + ']';
    }

    /**
     * Selects given columns from DataFrame and returns new DataFrame.
     *
     * Works like `df[["col1", "col2"]]` in pandas. Double brackets are important:
     * with single brackets and one column name pandas would return Series instead
     * of DataFrame, and Series does not have all methods which students expect.
     *
     * If user leaves column field empty, generates `df[[]]` — empty DataFrame with
     * same index as original. This is valid pandas expression, not an error, so
     * user can see result and understand that they forgot to type column names.
     *
     * Column names are case-sensitive and have to match names in DataFrame exactly.
     * There is no fuzzy matching: `transported` will not find `Transported`.
     */
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

    /**
     * Removes given columns from DataFrame and returns new DataFrame.
     *
     * Works like `df.drop(columns=["col1", "col2"])` in pandas. Original DataFrame
     * is not modified — pandas returns a copy, so student can keep both full table
     * and reduced version in different variables.
     *
     * If user leaves column field empty, returns original variable without any
     * operation. This keeps chain of blocks working without producing weird
     * `df.drop(columns=[])` call which does nothing but looks confusing.
     *
     * Typical use case: remove target column and service columns (like `PassengerId`)
     * before training a model. Same note about case-sensitivity as for select block.
     */
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
