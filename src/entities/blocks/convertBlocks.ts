/**
 * Code generators for type conversion blocks: to int, to float, to str, to bool,
 * and comment block.
 */

import {PythonGenerator, Order} from "blockly/python";
import * as Blockly from "blockly";


/**
 * Registers Python generators for conversion blocks on given generator instance.
 *
 * @param generator - Python generator which will get new block handlers.
 * @param mode - Current mode of generator. Not used right now, kept for
 *   consistency with other init functions.
 */
export function initConvertBlocks(generator: PythonGenerator, mode: "display"|"execution") {
    generator.forBlock["convert_to_int_block"] = function (block: Blockly.Block): [string, Order] {
        const valueToConvert = generator.valueToCode(block, "VALUE_TO_CONVERT", Order.ATOMIC) || "";
        return [`int(${valueToConvert})`, Order.FUNCTION_CALL];
    }

    generator.forBlock["convert_to_str_block"] = function (block: Blockly.Block): [string, Order] {
        const valueToConvert = generator.valueToCode(block, "VALUE_TO_CONVERT", Order.ATOMIC) || "";
        return [`str(${valueToConvert})`, Order.FUNCTION_CALL];
    }

    generator.forBlock["convert_to_float_block"] = function (block: Blockly.Block): [string, Order] {
        const valueToConvert = generator.valueToCode(block, "VALUE_TO_CONVERT", Order.ATOMIC) || "";
        return [`float(${valueToConvert})`, Order.FUNCTION_CALL];
    }

    generator.forBlock["convert_to_bool_block"] = function (block: Blockly.Block): [string, Order] {
        const valueToConvert = generator.valueToCode(block, "VALUE_TO_CONVERT", Order.ATOMIC) || "";
        return [`bool(${valueToConvert})`, Order.FUNCTION_CALL];
    }

    /**
     * Generates Python comment line. Comment does not affect program execution
     * and only explains what is happening in the code.
     */
    generator.forBlock["comment_block"] = function (block: Blockly.Block): string {
        const commentText = block.getFieldValue("COMMENT_TEXT");
        return `# ${commentText}\n`;
    }
}
