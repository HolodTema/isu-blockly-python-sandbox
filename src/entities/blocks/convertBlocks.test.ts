import { describe, it, expect } from 'vitest';
import { createTestContext, createTextBlock, connectUsingInputValue } from './testUtils';

describe('convertBlocks', () => {
    it('convert_to_int_block generates python code int()', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('convert_to_int_block');
        connectUsingInputValue(block, createTextBlock(testContext, '5'), 'VALUE_TO_CONVERT');
        expect(testContext.generateCodeForBlock(block)).toBe("int('5')");
    });

    it('convert_to_str_block generates python code str()', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('convert_to_str_block');
        connectUsingInputValue(block, createTextBlock(testContext, '67'), 'VALUE_TO_CONVERT');
        expect(testContext.generateCodeForBlock(block)).toBe("str('67')");
    });

    it('convert_to_float_block generates python code float()', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('convert_to_float_block');
        connectUsingInputValue(block, createTextBlock(testContext, '3.14'), 'VALUE_TO_CONVERT');
        expect(testContext.generateCodeForBlock(block)).toBe("float('3.14')");
    });

    it('convert_to_bool_block generates python code bool()', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('convert_to_bool_block');
        connectUsingInputValue(block, createTextBlock(testContext, 'yes'), 'VALUE_TO_CONVERT');
        expect(testContext.generateCodeForBlock(block)).toBe("bool('yes')");
    });

    it('convert_to_int_block without input values generates int()', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('convert_to_int_block');
        expect(testContext.generateCodeForBlock(block)).toBe('int()');
    });

    it('comment_block generates python comment', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('comment_block');
        block.setFieldValue('This is comment', 'COMMENT_TEXT');
        expect(testContext.generateCodeForBlock(block)).toBe('# This is comment\n');
    });
});
