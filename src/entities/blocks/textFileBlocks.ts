import {PythonGenerator, Order} from "blockly/python";
import * as Blockly from "blockly";


export function initTextFileBlocks(generator: PythonGenerator, mode: "display"|"execution") {
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

