import fs from 'fs-extra';
import path from 'path';
import { readFileSmart } from './utils.js';

/**
 * 生成新的适配器文件，基于模板。
 *
 * @param {string} name - 适配器名称（文件名）。
 * @returns {Promise<void>}
 */
export default async function genAdapter(name) {
  // 目标适配器文件路径（用户项目）
  const targetDir = path.resolve('translate_adapters');
  const targetPath = path.join(targetDir, `${name}.js`);

  if (fs.existsSync(targetPath)) {
    console.log(`适配器 ${name} 已存在`);
    return;
  }

  // 确保目标目录存在
  await fs.ensureDir(targetDir);

  const templateContent = await readFileSmart('templates/adapterTemplate.js', 'package');
  await fs.writeFile(targetPath, templateContent, 'utf8');
  console.log(`已生成适配器 lib/translate_adapters/${name}.js`);
}