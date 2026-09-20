import { describe, it, expect } from 'vitest';
import {
    createTestContext,
    createTextBlock,
    connectUsingInputValue,
    connectUsingStatement,
} from './testUtils';

describe('httpBlocks', () => {
    it('import_lib_requests_block generates import requests', () => {
        const testContext = createTestContext();
        expect(testContext.generateCodeForBlock(
            testContext.createBlockOfType('import_lib_requests_block'),
        )).toBe("import requests\n");
    });

    it('http_query_block generates key-value pair', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('http_query_block');
        connectUsingInputValue(block, createTextBlock(testContext, 'page'), 'KEY');
        connectUsingInputValue(block, createTextBlock(testContext, '1'), 'VALUE');

        expect(testContext.generateCodeForBlock(block)).toBe("'page': '1'");
    });

    it('http_header_block generates name-value pair', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('http_header_block');
        connectUsingInputValue(block, createTextBlock(testContext, 'Accept'), 'NAME');
        connectUsingInputValue(
            block,
            createTextBlock(testContext, 'application/json'),
            'VALUE',
        );

        expect(testContext.generateCodeForBlock(block))
            .toBe("'Accept': 'application/json'");
    });

    it('http_get_request_block generates requests.request with try-except wrapping', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('http_get_request_block');
        connectUsingInputValue(
            block,
            createTextBlock(testContext, 'https://example.com'),
            'PATH',
        );

        const code = testContext.generateCodeForBlock(block);
        expect(code).toContain("url = 'https://example.com'");
        expect(code).toContain("params = {}");
        expect(code).toContain("headers = {}");
        expect(code).toContain("try:");
        expect(code).toContain("requests.request(method=\"GET\"");
        expect(code).toContain("except Exception as e:");
    });

    it('http_get_request_block supports POST http method', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('http_get_request_block');
        block.setFieldValue('POST', 'REQUEST_TYPE');
        connectUsingInputValue(
            block,
            createTextBlock(testContext, 'https://example.com'),
            'PATH',
        );

        expect(testContext.generateCodeForBlock(block))
            .toContain("method=\"POST\"");
    });

    it('http_get_request_block collects query parameters into dict', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('http_get_request_block');
        connectUsingInputValue(
            block,
            createTextBlock(testContext, 'https://example.com'),
            'PATH',
        );

        const queryBlock = testContext.createBlockOfType('http_query_block');
        connectUsingInputValue(queryBlock, createTextBlock(testContext, 'q'), 'KEY');
        connectUsingInputValue(queryBlock, createTextBlock(testContext, 'test'), 'VALUE');
        connectUsingStatement(block, queryBlock, 'QUERY');

        expect(testContext.generateCodeForBlock(block))
            .toContain("params = {'q': 'test'}");
    });

    it('http_get_request_block collects headers into dict', () => {
        const testContext = createTestContext();
        const block = testContext.createBlockOfType('http_get_request_block');
        connectUsingInputValue(
            block,
            createTextBlock(testContext, 'https://example.com'),
            'PATH',
        );

        const headerBlock = testContext.createBlockOfType('http_header_block');
        connectUsingInputValue(headerBlock, createTextBlock(testContext, 'Accept'), 'NAME');
        connectUsingInputValue(
            headerBlock,
            createTextBlock(testContext, 'application/json'),
            'VALUE',
        );
        connectUsingStatement(block, headerBlock, 'HEADERS');

        expect(testContext.generateCodeForBlock(block))
            .toContain("headers = {'Accept': 'application/json'}");
    });
});
