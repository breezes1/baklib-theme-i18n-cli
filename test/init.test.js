import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockImport } from 'mock-import';

const { mockImport, reImport, resetAll } = createMockImport(import.meta.url);

const fsMock = {
  existsSync: () => false,
  copyFile: async (...args) => { fsMock.copyFile.calls.push(args); return; }
};
fsMock.copyFile.calls = [];

mockImport('fs-extra', fsMock);
let init;
test.before(async () => {
  init = (await reImport('../lib/core/init.js')).default;
});

test('应生成配置文件', async () => {
  await assert.doesNotReject(() => init());
  assert(fsMock.copyFile.calls.some(call => call[0].includes('config/default.config.json')));
});

test.after(resetAll);