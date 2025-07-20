import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import extractLangs from './extractLangs.js';

/**
 * 获取配置对象，优先用户项目根目录下的 .baklib_theme_i18nrc.json，
 * 若不存在则返回包内 config/default.config.json 的内容。
 * @param {string} [configPath] - 可选，配置文件路径，默认 '.baklib_theme_i18nrc.json'
 * @returns {Promise<Object>} 配置对象
 */
export async function getConfig(configPath = '.baklib_theme_i18nrc.json') {
  const absPath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(configPath);
  if (await fs.pathExists(absPath)) {
    return fs.readJson(absPath);
  }

  const defaultConfigPath = 'config/default.config.json';
  try {
    return JSON.parse(await readFileSmart(defaultConfigPath, 'package'));
  } catch {
    throw new Error(`未找到配置文件: ${absPath} 或包内默认配置: ${defaultConfigPath}`);
  }
}

/**
 * 统一读取文件内容，可指定读取包内文件或用户项目文件。
 *
 * @param {string} filePath - 文件路径（相对或绝对）。
 *   - scope 为 'user' 时，filePath 相对用户项目根目录。
 *   - scope 为 'package' 时，filePath 必须相对本包根目录（如 'config/default.config.json'）。
 * @param {'user'|'package'} [scope='user'] - 读取范围，'user' 为用户项目，'package' 为包内。
 * @returns {Promise<string|Buffer>} 文件内容
 */
export async function readFileSmart(filePath, scope = 'user') {
  let absPath;
  if (scope === 'package') {
    // 读取包内文件，filePath 必须相对包根目录
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(__dirname, '../../', filePath);
  } else {
    // 读取用户项目文件
    absPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
  }
  if (!await fs.pathExists(absPath)) {
    throw new Error(`文件不存在: ${absPath}`);
  }
  return fs.readFile(absPath, 'utf8');
}

/**
 * 获取全部语言列表
 * @param {object} config
 * @returns {Promise<string[]>}
 */
export async function allLanguages(config) {
  let langs = [config.defaultLanguage];
  let targets = config.targetLanguages;
  if (!targets || !targets.length) {
    targets = await extractLangs();
  }
  langs = langs.concat(targets || []);
  // 去重
  return [...new Set(langs)];
}

/**
 * 获取主语言
 * @param {object} config
 * @returns {Promise<string>}
 */
export async function mainLanguage(config) {
  if (config.defaultLanguage) return config.defaultLanguage;
  const langs = await allLanguages(config);
  return langs[0];
}

export function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

export function system_langs() {
  return {
    "zh-CN": "简体中文",
    "zh-TW": "繁體中文",
    "zh-HK": "繁體中文",
    "zh-MO": "繁體中文",
    "zh-SG": "简体中文",
    "en": "English",
    "en-US": "English (US)",
    "en-GB": "English (UK)",
    "en-AU": "English (Australia)",
    "en-CA": "English (Canada)",
    "en-NZ": "English (New Zealand)",
    "en-IE": "English (Ireland)",
    "pt": "Português",
    "pt-BR": "Português (Brasil)",
    "pt-PT": "Português (Portugal)",
    "es": "Español",
    "es-ES": "Español (España)",
    "es-MX": "Español (México)",
    "es-AR": "Español (Argentina)",
    "fr": "Français",
    "fr-FR": "Français (France)",
    "fr-CA": "Français (Canada)",
    "fr-BE": "Français (Belgique)",
    "fr-CH": "Français (Suisse)",
    "de": "Deutsch",
    "de-DE": "Deutsch (Deutschland)",
    "de-AT": "Deutsch (Österreich)",
    "de-CH": "Deutsch (Schweiz)",
    "ja": "日本語",
    "ko": "한국어",
    "vi": "Tiếng Việt",
    "th": "ไทย",
    "id": "Bahasa Indonesia",
    "ms": "Bahasa Melayu",
    "ar": "العربية",
    "hi": "हिन्दी",
    "bn": "বাংলা",
    "ru": "Русский",
    "tr": "Türkçe"
  }
}