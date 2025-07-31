import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockImport } from 'mock-import';

const { mockImport, reImport, resetAll } = createMockImport(import.meta.url);

// mock extractLangs 返回 ['en']
mockImport('../lib/core/extractLangs.js', async () => ['en']);

const fsMock = {
  readJson: async (file) => {
    if (file === '.baklib_theme_i18nrc.json') {
      return {
        defaultLanguage: 'zh-CN',
        targetLanguages: [], // 让 extractLangs 生效
        paths: { source: ['test/mock_src'], locales: 'test/mock_locales', schema: 'config/settings_schema.json' }
      };
    }
    return {};
  },
  existsSync: (file) => {
    return file === 'test/mock_src' || file.endsWith('config/settings_schema.json');
  },
  readdir: async () => ['a.liquid'],
  stat: async () => ({ isDirectory: () => false }),
  readFile: async (file) => {
    if (file === 'test/mock_src/a.liquid') {
      return `{{ 'hello.world' | t }}`;
    }
    if (file.endsWith('config/settings_schema.json')) {
      return JSON.stringify({
        name: 'theme_info',
        theme_languages: [
          { value: 'en' },
          { value: 'fr' }
        ]
      });
    }
    return '';
  },
  ensureDir: async () => {},
  writeJson: async (...args) => { fsMock.writeJson.calls.push(args); return; },
  pathExists: async (file) => file.endsWith('config/settings_schema.json'),
};
fsMock.writeJson.calls = [];

mockImport('fs-extra', fsMock);
let extractKeys, extractTKeys, extractSchemaTKeys, extractKeysFromContent, walk;
test.before(async () => {
  const mod = await reImport('../lib/core/extractKeys.js');
  extractKeys = mod.default;
  extractTKeys = mod.extractTKeys;
  extractSchemaTKeys = mod.extractSchemaTKeys;
  extractKeysFromContent = mod.extractKeysFromContent;
  walk = mod.walk;
});

test('应生成多语言 key 文件', async () => {
  await assert.doesNotReject(() => extractKeys());
  // console.log('writeJson calls:', fsMock.writeJson.calls);
  assert(fsMock.writeJson.calls.some(call => call[0].includes('zh-CN.json')));
  // assert(fsMock.writeJson.calls.some(call => call[0].includes('en.json')));
  // 如果有 schema 键，还会生成 schema 文件
  // assert(fsMock.writeJson.calls.some(call => call[0].includes('zh-CN.schema.json')));
  // assert(fsMock.writeJson.calls.some(call => call[0].includes('en.schema.json')));
});

test('extractTKeys: 正确提取 t key', () => {
  const content = `
    {{ "hello" | t }}
    {% 'welcome' | t: 123.2 %}
    {% 'welcome1' | t: 66 %}
    {{ 'a' | b | t }}
    {{ 'b' | t: 'x' }}
    {{ 'c' | b | t: 'x' }}
    {{ 'd' | t }}
    {% assign empty_title = 'generic.empty.title' | t: '没有找到相关内容' %}
  `;
  const data = extractTKeys(content);
  const result = {
    'hello': '',
    "welcome": 123.2,
    "welcome1": 66,
    "b": 'x',
    "d": '',
    "generic.empty.title": '没有找到相关内容'
  }
  assert(JSON.stringify(data) === JSON.stringify(result));
});

test('extractSchemaTKeys: 正确提取 schema key', () => {
  const content = `
    {% schema %}
      {
        "settings": [
          { "value": "t:schema.foo" },
          { "value": "bar" },
          { "value": "t:baz" }
        ]
      }
    {% endschema %}
  `;
  const data = extractSchemaTKeys(content);
  const result = {
    "schema.foo": '',
    "baz": ''
  }
  assert(JSON.stringify(data) === JSON.stringify(result));
});

test('extractKeysFromContent: 综合提取', () => {
  const content = `
    {{ "hello" | t }}{{ 's1.x' | t: 'a' }}
    {% schema %}
      {
        "settings": [{ "value": "t:foo" }]
      }
    {% endschema %}
  `;
  const data = extractKeysFromContent(content, 'xx.liquid');
  console.log('data', data)
  const result = {
    "hello": '',
    "s1.x": 'a',
    "foo": ''
  }
  assert(JSON.stringify(data) === JSON.stringify(result));
});

test('walk: 能递归遍历文件', async () => {
  const files = await walk('test/mock_src', ['.liquid']);
  assert.deepEqual(files, ['test/mock_src/a.liquid']);
});

test.after(resetAll);