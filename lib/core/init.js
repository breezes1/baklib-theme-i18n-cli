import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 初始化配置文件
 *
 * - 若 .baklib_theme_i18nrc.json 不存在，则复制默认配置。
 *
 * @returns {Promise<void>}
 */
export default async function init() {
  // 通过 import.meta.url 获取当前文件绝对路径，确保无论 CLI 被安装到哪里都能定位到包内资源
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename); // 当前文件所在目录（lib/core）

  // 用户项目根目录下的配置文件路径
  const configPath = path.resolve('.baklib_theme_i18nrc.json');
  // npm 包内默认配置文件的绝对路径（lib/core/../config/default.config.json）
  const defaultConfigPath = path.join(__dirname, '../../config/default.config.json');

  // 检查用户项目下是否已有配置文件
  if (!fs.existsSync(configPath)) {
    // 复制 npm 包内的默认配置到用户项目根目录
    await fs.copyFile(defaultConfigPath, configPath);
    console.log('已生成 .baklib_theme_i18nrc.json');
  } else {
    console.log('.baklib_theme_i18nrc.json 已存在');
  }
}