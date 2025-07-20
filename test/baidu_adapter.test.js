import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockImport } from 'mock-import';

const { mockImport, reImport, resetAll } = createMockImport(import.meta.url);

function fetchMock() {
  return {
    json: () => Promise.resolve({ trans_result: [{ dst: 'Hello, world!' }] })
  };
}
fetchMock.default = fetchMock; // 兼容 import * as fetch from 'node-fetch'

mockImport('node-fetch', fetchMock);
let BaiduAdapter;
test.before(async () => {
  BaiduAdapter = (await reImport('../lib/adapters/baidu.js')).default;
});

test('translate 方法应返回 mock 的翻译结果', async () => {
  const adapter = new BaiduAdapter({
    appid: '',
    secretKey: '',
    url: 'https://fanyi-api.baidu.com/api/trans/vip/translate'
  });
  const res = await adapter.translate({ text: '你好，世界', from: 'zh', to: 'en' });
  assert.strictEqual(res.translated_text, 'Hello, world!');
});

test.after(resetAll);