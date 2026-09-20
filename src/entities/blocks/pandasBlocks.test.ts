import { describe, it, expect } from 'vitest';
import {
    createTestContext,
    createTextBlock,
    createVariableGetBlock,
    connectUsingInputValue,
} from './testUtils';

describe('pandasBlocks', () => {
    it('pandas_import_block generates import pandas as pd', () => {
        const testContext = createTestContext();
        expect(testContext.generateCodeForBlock(
            testContext.createBlockOfType('pandas_import_block'),
        )).toBe("import pandas as pd\n");
    });

    it('pandas_read_html_block saves to specified variable', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('pandas_read_html_block');

        const variable = testContext.workspace.getVariableMap().createVariable('df');
        block.setFieldValue(variable.getId(), 'RESULT_VAR');
        connectUsingInputValue(
            block,
            createTextBlock(testContext, '<table></table>'),
            'TEXT_WITH_TABLE',
        );

        expect(testContext.generateCodeForBlock(block))
            .toBe("df = pd.read_html('<table></table>')[0]\n");
    });

    it('pandas_read_json_block saves to specified variable with records orient', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('pandas_read_json_block');

        const variable = testContext.workspace.getVariableMap().createVariable('data');
        block.setFieldValue(variable.getId(), 'RESULT_VAR');
        block.setFieldValue('records', 'ORIENT');
        connectUsingInputValue(block, createTextBlock(testContext, '[]'), 'TEXT_WITH_TABLE');

        expect(testContext.generateCodeForBlock(block))
            .toBe("data = pd.read_json('[]', orient=\"records\")\n");
    });

    it('pandas_read_json_block respects index orient option', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('pandas_read_json_block');

        const variable = testContext.workspace.getVariableMap().createVariable('df');
        block.setFieldValue(variable.getId(), 'RESULT_VAR');
        block.setFieldValue('index', 'ORIENT');
        connectUsingInputValue(block, createTextBlock(testContext, '{}'), 'TEXT_WITH_TABLE');

        expect(testContext.generateCodeForBlock(block))
            .toBe("df = pd.read_json('{}', orient=\"index\")\n");
    });

    it('pandas_read_csv_block saves to specified variable with comma separator', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('pandas_read_csv_block');

        const variable = testContext.workspace.getVariableMap().createVariable('data');
        block.setFieldValue(variable.getId(), 'RESULT_VAR');
        block.setFieldValue(',', 'SEP');
        connectUsingInputValue(block, createTextBlock(testContext, 'a,b'), 'TEXT_WITH_TABLE');

        expect(testContext.generateCodeForBlock(block))
            .toBe("data = pd.read_csv('a,b', sep=\",\")\n");
    });

    it('pandas_read_csv_block respects semicolon separator option', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('pandas_read_csv_block');

        const variable = testContext.workspace.getVariableMap().createVariable('df');
        block.setFieldValue(variable.getId(), 'RESULT_VAR');
        block.setFieldValue(';', 'SEP');
        connectUsingInputValue(block, createTextBlock(testContext, 'a;b'), 'TEXT_WITH_TABLE');

        expect(testContext.generateCodeForBlock(block))
            .toBe("df = pd.read_csv('a;b', sep=\";\")\n");
    });

    it('pandas_concat_block generates pd.concat call', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('pandas_concat_block');
        connectUsingInputValue(block, createVariableGetBlock(testContext, 'frames'), 'LIST');

        expect(testContext.generateCodeForBlock(block)).toBe("pd.concat(frames)");
    });

    it('pandas_head_n_block generates head call with row count', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('pandas_head_n_block');

        connectUsingInputValue(
            block,
            createVariableGetBlock(testContext, 'df'),
            'PandasDataFrame',
        );

        const nBlock = testContext.createBlockOfType('math_number');
        nBlock.setFieldValue('3', 'NUM');
        connectUsingInputValue(block, nBlock, 'N');

        expect(testContext.generateCodeForBlock(block)).toBe("df.head(3)");
    });

    it('pandas_tail_n_block generates tail call with row count', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('pandas_tail_n_block');

        connectUsingInputValue(
            block,
            createVariableGetBlock(testContext, 'df'),
            'PandasDataFrame',
        );

        const nBlock = testContext.createBlockOfType('math_number');
        nBlock.setFieldValue('7', 'NUM');
        connectUsingInputValue(block, nBlock, 'N');

        expect(testContext.generateCodeForBlock(block)).toBe("df.tail(7)");
    });

    it('pandas_append_to_list_block generates append call', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('pandas_append_to_list_block');

        connectUsingInputValue(
            block,
            createVariableGetBlock(testContext, 'frames'),
            'LIST',
        );
        connectUsingInputValue(block, createTextBlock(testContext, 'value'), 'ITEM');

        expect(testContext.generateCodeForBlock(block)).toBe("frames.append('value')\n");
    });

    it('pandas_to_csv_block generates to_csv without index', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('pandas_to_csv_block');

        connectUsingInputValue(block, createVariableGetBlock(testContext, 'df'), 'DF');
        block.setFieldValue('out.csv', 'FILE_PATH');

        expect(testContext.generateCodeForBlock(block))
            .toBe("df.to_csv(\"out.csv\", index=False)\n");
    });

    it('pandas_info_block generates info call', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('pandas_info_block');

        connectUsingInputValue(block, createVariableGetBlock(testContext, 'df'), 'DF');

        expect(testContext.generateCodeForBlock(block)).toBe("df.info()\n");
    });
});
