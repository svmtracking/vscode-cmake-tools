import * as path from 'path';

import * as assert from 'assert';

import * as vscode from 'vscode';
import * as cmake_tools_ext from '../src/extension';

import * as cmake from '../src/cmake';

const here = __dirname;

function testFilePath(filename: string): string {
    return path.normalize(path.join(here, '../..', 'test', filename));
}


suite("Utility tests", () => {
    test("Reloads only when needed", async function () {
        const reader = new cmake.CacheReader(testFilePath('TestCMakeCache.txt'));
        assert.strictEqual(await reader.needsReloading(), true);
        assert.strictEqual(await reader.needsReloading(), true);
        await reader.get("CMAKE_GENERATOR");
        assert.strictEqual(await reader.needsReloading(), false);
    });
    test("Read CMake Cache", async function () {
        const reader = new cmake.CacheReader(testFilePath("TestCMakeCache.txt"));
        const generator = await reader.get("CMAKE_GENERATOR");
        assert.strictEqual(
            generator.type,
            cmake.EntryType.Internal
        );
        assert.strictEqual(
            generator.key,
            'CMAKE_GENERATOR'
        );
        assert.strictEqual(
            generator.value,
            'Ninja'
        );
        assert.strictEqual(
            generator.as<string>(),
            'Ninja'
        );
        assert.strictEqual(typeof generator.value === 'string', true);

        const build_testing = await reader.get('BUILD_TESTING');
        assert.strictEqual(
            build_testing.type,
            cmake.EntryType.Bool
        );
        assert.strictEqual(
            build_testing.as<boolean>(),
            true
        );
    });
    test("Read cache with various newlines", async function() {
        for (const newline of ['\n', '\r\n', '\r']) {
            const str = [
                '# This line is ignored',
                '// This line is docs',
                'SOMETHING:STRING=foo',
                ''
            ].join(newline);
            const entries = cmake.CacheReader.parseCache(str);
            const message = `Using newline ${JSON.stringify(newline)}`
            assert.strictEqual(entries.size, 1, message);
            assert.strictEqual(entries.has('SOMETHING'), true);
            const entry = entries.get('SOMETHING');
            assert.strictEqual(entry.value, 'foo');
            assert.strictEqual(entry.type, cmake.EntryType.String);
            assert.strictEqual(entry.docs, 'This line is docs');
        }
    });
    test('Falsey values', () => {
        for (const thing of [
            '0',
            '',
            'NO',
            'FALSE',
            'OFF',
            'NOTFOUND',
            'IGNORE',
            'N',
            'SOMETHING-NOTFOUND',
            null,
            false,
        ]) {
            assert.strictEqual(cmake.isTruthy(thing), false, 'Testing truthiness of ' + thing);
        }
    });
    test('Truthy values', () => {
        for (const thing of [
            '1',
            'ON',
            'YES',
            'Y',
            '112',
            12,
            'SOMETHING'
        ]) {
            assert.strictEqual(cmake.isTruthy(thing), true, 'Testing truthiness of ' + thing);
        }
    });
});