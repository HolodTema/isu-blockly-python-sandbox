import {PythonGenerator, Order} from "blockly/python";
import * as Blockly from "blockly";


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

    generator.forBlock["comment_block"] = function (block: Blockly.Block): string {
        const commentText = block.getFieldValue("COMMENT_TEXT");
        return `# ${commentText}\n`;
    }
}
