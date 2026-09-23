/**
 * Code generators for text file blocks: open, read, read lines, write to end
 * and close.
 *
 * All blocks work with Python file object which is stored in variable. Same
 * variable is passed between blocks through "FILE_VARIABLE" input.
 */

import {PythonGenerator, Order} from "blockly/python";
import * as Blockly from "blockly";


/**
 * Registers Python generators for text file blocks on given generator instance.
 *
 * @param generator - Python generator which will get new block handlers.
 * @param _mode - Current mode of generator. Not used right now.
 */
export function initTextFileBlocks(generator: PythonGenerator, _mode: "display"|"execution") {

    /**
     * Opens file in given mode and saves file object into variable.
     *
     * File path is taken as plain text from field, mode from dropdown. Both
     * become parts of `open(...)` call.
     */
    generator.forBlock["text_file_open_block"] = function (block: Blockly.Block): string {
        const filePath = block.getFieldValue("FILE_PATH");
        const fileMode = block.getFieldValue("MODE");
        const variableCode = generator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
        return `${variableCode} = open("${filePath}", '${fileMode}')\n`;
    };

    generator.forBlock["text_file_read_block"] = function (block: Blockly.Block): [string, Order] {
        const fileVariable = generator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
        const code = `${fileVariable}.read()`;
        return [code, Order.FUNCTION_CALL];
    };

    generator.forBlock["text_file_read_lines_block"] = function (block: Blockly.Block): [string, Order] {
        const fileVariable = generator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
        const code = `${fileVariable}.readlines()`;
        return [code, Order.FUNCTION_CALL];
    };

    generator.forBlock["text_file_write_to_end_block"] = function (block: Blockly.Block): string {
        const fileVariable = generator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
        const textToWrite = generator.valueToCode(block, "TEXT_TO_WRITE", Order.ATOMIC) || "";
        return `${fileVariable}.write(${textToWrite})\n`;
    };

    generator.forBlock["text_file_close_block"] = function (block: Blockly.Block): string {
        const fileVariable = generator.valueToCode(block, "FILE_VARIABLE", Order.ATOMIC) || "file";
        return `${fileVariable}.close()\n`;
    };
}
