import fs from 'fs-extra';
import path from 'path';
import { getConfig, readFileSmart } from './utils.js';

/**
 * 提取 config/settings_schema.json 中 theme_languages 字段，返回语言列表。
 *
 * @returns {Promise<string[]>} 语言列表数组
 */
export default async function extractLangs() {
  const config = await getConfig();
  const schemaPath = path.resolve(config.paths.schema);
  if (!fs.existsSync(schemaPath)) {
    console.error('未找到 schema 文件:', schemaPath);
    return [];
  }
  const schema = JSON.parse(await readFileSmart(schemaPath, 'user'));
  const themeInfo = Array.isArray(schema)
    ? schema.find(item => item.name === 'theme_info')
    : schema;
  const langs = themeInfo && themeInfo.theme_languages
    ? themeInfo.theme_languages.map(l => l.value)
    : [];
  if (langs.length) {
    console.log('提取到的语言列表:', langs);
  } else {
    console.log('未提取到语言列表');
  }
  return langs;
}