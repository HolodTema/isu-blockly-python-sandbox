import {PythonGenerator, Order} from "blockly/python";
import * as Blockly from "blockly";

export function initBaseBlocks(generator: PythonGenerator, mode: "display"|"execution") {
    generator.forBlock["start_block"] = function(block: Blockly.Block) {
        return "";
    };

    generator.forBlock["custom_if_block"] = function(block: Blockly.Block): string {
        let condition = generator.valueToCode(block, "CONDITION", Order.ATOMIC) || "False";
        let codeInsideIf = generator.statementToCode(block, "THEN");
        return `if ${condition}:\n${codeInsideIf}\n`;
    };

    generator.forBlock["custom_if_else_block"] = function(block: Blockly.Block): string {
        const condition = generator.valueToCode(block, "CONDITION", Order.ATOMIC) || "False";
        const thenCode = generator.statementToCode(block, "THEN");
        const elseCode = generator.statementToCode(block, "ELSE");
        return `if ${condition}:\n${thenCode}else:\n${elseCode}\n`;
    };

    generator.forBlock["custom_if_elif_else_block"] = function(block: Blockly.Block): string {
        const cond1 = generator.valueToCode(block, "COND1", Order.ATOMIC) || "False";
        const then1 = generator.statementToCode(block, "THEN1");
        const cond2 = generator.valueToCode(block, "COND2", Order.ATOMIC) || "False";
        const then2 = generator.statementToCode(block, "THEN2");
        const elseCode = generator.statementToCode(block, "ELSE");
        return `if ${cond1}:\n${then1}elif ${cond2}:\n${then2}else:\n${elseCode}\n`;
    };

    generator.forBlock["text_join_block"] = function(block: Blockly.Block): [string, Order] {
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
    };

    generator.forBlock["print_block"] = function(block: Blockly.Block): string {
        const text = generator.valueToCode(block, "TEXT", Order.NONE) || '""';
        return "print(" + text + ")\n";
    };

    generator.forBlock["print_two_values_block"] = function(block: Blockly.Block): string {
        const text1 = generator.valueToCode(block, "TEXT1", Order.NONE) || '""';
        const text2 = generator.valueToCode(block, "TEXT2", Order.NONE) || '""';
        return `print(${text1}, ${text2})\n`;
    };

    generator.forBlock["input_block"] = function(block: Blockly.Block): [string, Order] {
        const text = generator.valueToCode(block, "TEXT", Order.NONE) || '""';
        return [`input(${text})`, Order.FUNCTION_CALL];
    };

    generator.forBlock["custom_for_block"] = function(block: Blockly.Block): string {
        const varId = block.getFieldValue("VAR_COUNTER");
        const varName = generator.getVariableName(varId) || "i";

        const start = generator.valueToCode(block, "START", Order.ATOMIC) || "0";
        const stop = generator.valueToCode(block, "STOP", Order.ATOMIC) || "0";
        const step = generator.valueToCode(block, "STEP", Order.ATOMIC) || "1";

        let body: string = generator.statementToCode(block, "DO");
        if (body.length == 0) {
            body = "    pass";
        }
        return `for ${varName} in range(${start}, ${stop}, ${step}):\n${body}\n`;
    };

    generator.forBlock["custom_variables_set_block"] = function(block: Blockly.Block): string {
        const varId = block.getFieldValue("VAR_NAME");
        const varModel = block.workspace.getVariableMap().getVariableById(varId);
        const varName = varModel ? varModel.getName() : "var";

        const value = generator.valueToCode(block, "VAR_VALUE", Order.NONE) || "None";
        return `${varName} = ${value}\n`;
    };
}