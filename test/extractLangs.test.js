import test from 'node:test';
import { createMockImport } from 'mock-import';

const { mockImport, reImport, resetAll } = createMockImport(import.meta.url);

const fsMock = {
  readJson: async (file) => {
    if (file === '.baklib_theme_i18nrc.json') {
      return { paths: { schema: 'test/mock_schema.json' } };
    }
    if (file === 'test/mock_schema.json' || file.endsWith('/test/mock_schema.json')) {
      return [
        {
          name: 'theme_info',
          theme_languages: [
            { name: '中文', value: 'zh-CN' },
            { name: '英文', value: 'en' }
          ]
        }
      ];
    }
    return {};
  },
  existsSync: (file) => file === 'test/mock_schema.json' || file.endsWith('/test/mock_schema.json'),
};

mockImport('fs-extra', fsMock);
let extractLangs;
test.before(async () => {
  extractLangs = (await reImport('../lib/core/extractLangs.js')).default;
});

test('应能正确提取语言列表', async () => {
  await extractLangs();
});

test.after(resetAll);