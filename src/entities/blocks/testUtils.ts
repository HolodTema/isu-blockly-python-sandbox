import * as Blockly from 'blockly';
import { PythonGenerator, pythonGenerator } from 'blockly/python';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { initBaseBlocks } from './baseBlocks';
import { initConvertBlocks } from './convertBlocks';
import { initTextFileBlocks } from './textFileBlocks';
import { initPandasBlocks } from './pandasBlocks';
import { initHttpBlocks } from './httpBlocks';

let areBlocksDefined = false;

function defineBlocks(): void {
    if (areBlocksDefined) {
        return;
    }

    const currDir = dirname(fileURLToPath(import.meta.url));
    const pathToBlocksJson = resolve(currDir, '../../../public/assets/blockly/blocks.json');
    const blocksJson = JSON.parse(readFileSync(pathToBlocksJson, 'utf8'));

    Blockly.defineBlocksWithJsonArray(blocksJson);
    areBlocksDefined = true;
}

export interface TestContext {
    workspace: Blockly.Workspace;
    createBlockOfType: (type: string) => Blockly.Block;
    generateCodeForBlock: (block: Blockly.Block) => string;
}

export function blockGeneratedCodeToPlainString(code: string | [string, number] | null): string {
    if (code === null) {
        return '';
    }
    return typeof code === 'string' ? code : code[0];
}

export function createTestContext(): TestContext {
    defineBlocks();

    const workspace = new Blockly.Workspace();
    const generator = new PythonGenerator('Python');
    generator.INDENT = '    ';

    Object.assign(generator.forBlock, pythonGenerator.forBlock);

    initBaseBlocks(generator, 'execution');
    initConvertBlocks(generator, 'execution');
    initTextFileBlocks(generator, 'execution');
    initPandasBlocks(generator, 'execution');
    initHttpBlocks(generator, 'execution');

    return {
        workspace,
        createBlockOfType: (type) => {
            return workspace.newBlock(type);
        },
        generateCodeForBlock: (block) => {
            generator.init(workspace);
            return blockGeneratedCodeToPlainString(generator.blockToCode(block));
        }
    };
}

export function createTextBlock(testContext: TestContext, text: string): Blockly.Block {
    const block = testContext.createBlockOfType('text');
    block.setFieldValue(text, 'TEXT');
    return block;
}

export function connectUsingInputValue(
    parentBlock: Blockly.Block,
    childBlock: Blockly.Block,
    inputValueName: string
): void {
    parentBlock.getInput(inputValueName)!.connection!.connect(childBlock.outputConnection!);
}

export function connectUsingStatement(
    parentBlock: Blockly.Block,
    childBlock: Blockly.Block,
    statementName: string
): void {
    parentBlcok.getInput(statementName)!.connection!.connect(childBlock.previousConnection);
}
