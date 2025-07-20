import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockImport } from 'mock-import';

const { mockImport, reImport, resetAll } = createMockImport(import.meta.url);

const fsMock = {
  existsSync: () => false,
  copyFile: async (...args) => { fsMock.copyFile.calls.push(args); return; },
  writeFile: async (...args) => { fsMock.writeFile.calls.push(args); return; },
  ensureDir: async () => {}
};
fsMock.copyFile.calls = [];
fsMock.writeFile.calls = [];

mockImport('fs-extra', fsMock);
let genAdapter;
test.before(async () => {
  genAdapter = (await reImport('../lib/core/genAdapter.js')).default;
});

test('应生成新适配器文件', async () => {
  await assert.doesNotReject(() => genAdapter('testAdapter'));
  assert(fsMock.writeFile.calls.some(call => call[0].includes('translate_adapters/testAdapter.js')));
});

test.after(resetAll);