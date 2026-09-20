import { describe, it, expect } from 'vitest';
import {
    createTestContext,
    createTextBlock,
    connectUsingInputValue,
    connectUsingStatement,
} from './testUtils';

describe('baseBlocks', () => {
    it('start_block generates empty string', () => {
        const testContext = createTestContext();
        expect(testContext.generateCodeForBlock(testContext.createBlockOfType('start_block'))).toBe('');
    });

    it('print_block generates python code print(someStr)', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('print_block');
        connectUsingInputValue(block, createTextBlock(testContext, 'Hello'), 'TEXT');
        expect(testContext.generateCodeForBlock(block)).toBe("print('Hello')\n");
    });

    it('print_block without value inside generates empty print()', () => {
        const testContext = createTestContext();
        expect(testContext.generateCodeForBlock(testContext.createBlockOfType('print_block'))).toBe('print("")\n');
    });

    it('print_two_values_block prints two values using comma', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('print_two_values_block');
        connectUsingInputValue(block, createTextBlock(testContext, 'a'), 'TEXT1');
        connectUsingInputValue(block, createTextBlock(testContext, 'b'), 'TEXT2');
        expect(testContext.generateCodeForBlock(block)).toBe("print('a', 'b')\n");
    });

    it('input_block generates python code в input(someStr)', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('input_block');
        connectUsingInputValue(block, createTextBlock(testContext, 'enter number'), 'TEXT');
        expect(testContext.generateCodeForBlock(block)).toBe("input('enter number')");
    });

    it('custom_if_block generates if construction', () => {
        const testContext = createTestContext();
        const ifBlock = testContext.createBlockOfType('custom_if_block');
        const condBlock = testContext.createBlockOfType('logic_boolean');
        condBlock.setFieldValue('TRUE', 'BOOL');
        connectUsingInputValue(ifBlock, condBlock, 'CONDITION');

        const printBlock = testContext.createBlockOfType('print_block');
        connectUsingInputValue(printBlock, createTextBlock(testContext, 'someText'), 'TEXT');
        connectUsingStatement(ifBlock, printBlock, 'THEN');

        expect(testContext.generateCodeForBlock(ifBlock)).toBe("if True:\n    print('someText')\n\n");
    });

    it('custom_if_else_block generates if-else construction', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('custom_if_else_block');
        const cond = testContext.createBlockOfType('logic_boolean');
        cond.setFieldValue('FALSE', 'BOOL');
        connectUsingInputValue(block,  cond, 'CONDITION');

        const thenPrint = testContext.createBlockOfType('print_block');
        connectUsingInputValue(thenPrint, createTextBlock(testContext, 't'), 'TEXT');
        connectUsingStatement(block, thenPrint, 'THEN');

        const elsePrint = testContext.createBlockOfType('print_block');
        connectUsingInputValue(elsePrint, createTextBlock(testContext, 'f'), 'TEXT');
        connectUsingStatement(block, elsePrint, 'ELSE');

        expect(testContext.generateCodeForBlock(block)).toBe(
            "if False:\n    print('t')\nelse:\n    print('f')\n\n",
        );
    });

    it('custom_for_block generates for-loop with range()', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('custom_for_block');
        const variable = testContext.workspace.getVariableMap().createVariable('i');
        block.setFieldValue(variable.getId(), 'VAR_COUNTER');

        const start = testContext.createBlockOfType('math_number');
        start.setFieldValue('1', 'NUM');
        connectUsingInputValue(block, start, 'START');

        const stop = testContext.createBlockOfType('math_number');
        stop.setFieldValue('10', 'NUM');
        connectUsingInputValue(block, stop, 'STOP');

        const step = testContext.createBlockOfType('math_number');
        step.setFieldValue('1', 'NUM');
        connectUsingInputValue(block, step, 'STEP');

        const body = testContext.createBlockOfType('print_block');
        connectUsingInputValue(body, createTextBlock(testContext, 'x'), 'TEXT');
        connectUsingStatement(block, body, 'DO');

        const code = testContext.generateCodeForBlock(block);
        expect(code).toContain('for i in range(1, 10, 1):');
        expect(code).toContain("print('x')");
    });
});
