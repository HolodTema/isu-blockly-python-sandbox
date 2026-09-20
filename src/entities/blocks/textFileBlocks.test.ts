import { describe, it, expect } from 'vitest';
import {
    createTestContext,
    createTextBlock,
    createVariableGetBlock,
    connectUsingInputValue,
} from './testUtils';

describe('textFileBlocks', () => {
    it('text_file_open_block generates file-opening in read mode', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('text_file_open_block');
        block.setFieldValue('data.txt', 'FILE_PATH');
        block.setFieldValue('r', 'MODE');
        connectUsingInputValue(
            block,
            createVariableGetBlock(testContext, 'f'),
            'FILE_VARIABLE',
        );

        expect(testContext.generateCodeForBlock(block))
            .toBe("f = open(\"data.txt\", 'r')\n");
    });

    it('text_file_open_block generates file-opening in write mode', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('text_file_open_block');
        block.setFieldValue('out.txt', 'FILE_PATH');
        block.setFieldValue('w', 'MODE');
        connectUsingInputValue(
            block,
            createVariableGetBlock(testContext, 'f'),
            'FILE_VARIABLE',
        );

        expect(testContext.generateCodeForBlock(block))
            .toBe("f = open(\"out.txt\", 'w')\n");
    });

    it('text_file_open_block generates file-opening in append mode', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('text_file_open_block');
        block.setFieldValue('log.txt', 'FILE_PATH');
        block.setFieldValue('a', 'MODE');
        connectUsingInputValue(
            block,
            createVariableGetBlock(testContext, 'f'),
            'FILE_VARIABLE',
        );

        expect(testContext.generateCodeForBlock(block))
            .toBe("f = open(\"log.txt\", 'a')\n");
    });

    it('text_file_read_block generates read call', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('text_file_read_block');
        connectUsingInputValue(
            block,
            createVariableGetBlock(testContext, 'f'),
            'FILE_VARIABLE',
        );

        expect(testContext.generateCodeForBlock(block)).toBe("f.read()");
    });

    it('text_file_read_lines_block generates readlines call', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('text_file_read_lines_block');
        connectUsingInputValue(
            block,
            createVariableGetBlock(testContext, 'f'),
            'FILE_VARIABLE',
        );

        expect(testContext.generateCodeForBlock(block)).toBe("f.readlines()");
    });

    it('text_file_write_to_end_block generates write call', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('text_file_write_to_end_block');
        connectUsingInputValue(
            block,
            createVariableGetBlock(testContext, 'f'),
            'FILE_VARIABLE',
        );
        connectUsingInputValue(
            block,
            createTextBlock(testContext, 'hello'),
            'TEXT_TO_WRITE',
        );

        expect(testContext.generateCodeForBlock(block)).toBe("f.write('hello')\n");
    });

    it('text_file_close_block generates close call', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('text_file_close_block');
        connectUsingInputValue(
            block,
            createVariableGetBlock(testContext, 'f'),
            'FILE_VARIABLE',
        );

        expect(testContext.generateCodeForBlock(block)).toBe("f.close()\n");
    });
});
