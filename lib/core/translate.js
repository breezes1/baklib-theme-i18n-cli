import fs from 'fs-extra';
import path from 'path';
import { getConfig, readFileSmart, allLanguages, mainLanguage, isPlainObject } from './utils.js';

/**
 * 加载适配器：优先路径（用户自定义），否则名称（包内）。
 *
 * @param {Object} param
 * @param {string} [param.adapterPath] - 适配器绝对/相对路径。
 * @param {string} [param.adapterName] - 包内适配器名称。
 * @returns {Promise<any>} 适配器类（默认导出）。
 */
async function loadAdapter({ adapterPath, adapterName }) {
  if (adapterPath) {
    try {
      return (await import(adapterPath)).default;
    } catch (e) {
      throw new Error(`适配器路径加载失败: ${adapterPath}\n${e.message}`);
    }
  }
  if (adapterName) {
    try {
      return (await import(`../adapters/${adapterName}.js`)).default;
    } catch (e) {
      throw new Error(`包内适配器加载失败: ${adapterName}\n${e.message}`);
    }
  }
  throw new Error('未指定适配器路径(adapterPath)或名称(adapterName)');
}

/**
 * 递归翻译 JSON 对象，保留结构，支持增量翻译，直接修改 targetObj。
 * @param {any} source - 输入数据
 * @param {any} target - 输出数据
 * @param {function(string): Promise<string>} translateFn - 翻译函数 (mainText)
 * @returns {Promise<any>} 翻译后的 JSON
 */
async function translateJson(source, target, translateFn) {
  const targetType = typeof target
  if (typeof source === 'string') {
    if ((targetType === 'string' && target) || typeof target === 'number') return target
    if (!source) return source;
    const translated = await translateFn(source);
    return translated;
  }
  if (Array.isArray(source)) {
    if (!Array.isArray(target)) target = [];
    for (let i = 0; i < source.length; i++) {
      target[i] = await translateJson(source[i], target[i], translateFn);
    }
    return target;
  } else if (isPlainObject(source)) {
    if (!isPlainObject(target)) target = {};
    for (const [k, v] of Object.entries(source)) {
      target[k] = await translateJson(v, target[k], translateFn);
    }
    return target;
  } else {
    // 其他类型直接返回
    return source;
  }
}

/**
 * 根据主语言文件，调用适配器批量翻译并生成目标语言的翻译文件。
 *
 * @param {Object} opts - 配置项。
 * @param {string} [opts.config] - 配置文件路径，默认 '.baklib_theme_i18nrc.json'。
 * @param {string} [opts.adapterPath] - 适配器绝对/相对路径。
 * @param {string} [opts.adapterName] - 包内适配器名称。
 * @returns {Promise<void>}
 */
export default async function translate(opts = {}) {
  const config = await getConfig(opts.config);
  // 优先 opts.adapterPath，其次 opts.adapterName，其次 config.adapterPath/config.adapterName
  const adapterPath = opts.adapterPath || config.adapterPath;
  const adapterName = opts.adapterName || config.adapterName;
  if (!adapterPath && !adapterName) {
    throw new Error('未在参数或配置文件中指定 adapterPath 或 adapterName');
  }
  if (!config.paths || !config.paths.locales) {
    throw new Error('配置文件缺少 paths.locales 字段');
  }
  const localesDir = config.paths.locales;
  const AdapterClass = await loadAdapter({ adapterPath, adapterName });
  const adapter = new AdapterClass(config.adapterOptions);
  const langMap = config.langMap || {};

  // 使用 mainLanguage 和 allLanguages
  const mainLang = await mainLanguage(config);
  const langs = await allLanguages(config);
  const targetLangs = langs.filter(l => l !== mainLang);

  for (let fileType of ['json', 'schema.json']) {
    const mainFile = path.join(localesDir, `${mainLang}.${fileType}`);
    if (!fs.existsSync(mainFile)) {
      continue;
    }
    const mainData = JSON.parse(await readFileSmart(mainFile, 'user'));
    for (let lang of targetLangs) {
      const outFile = path.join(localesDir, `${lang}.${fileType}`);
      let outData = {};
      if (fs.existsSync(outFile)) {
        try {
          outData = JSON.parse(await readFileSmart(outFile, 'user'));
        } catch {}
      }
      // 递归翻译整个 JSON 结构，保留结构，支持增量，直接修改 outData
      const translated = await translateJson(mainData, outData, async (mainText) => {
        const res = await adapter.translate({ text: mainText, from: mainLang, to: lang, langMap });
        return res.translated_text;
      });
      await fs.writeJson(outFile, translated, { spaces: 2 });
      console.log(`已生成翻译文件: ${outFile}`);
    }
  }
}
