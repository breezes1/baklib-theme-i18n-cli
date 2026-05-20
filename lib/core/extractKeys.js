import fs from 'fs-extra';
import path from 'path';
import { getConfig, readFileSmart, allLanguages, mainLanguage, isPlainObject } from './utils.js';

/**
 * 从 Liquid 模板路径推导 i18n_scope，与 ThemeEngine::Liquid::Patchers::Context#i18n_scope 一致。
 * @param {string} filePath
 * @returns {string|null}
 */
function i18nScopeFromFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  const layoutMatch = normalized.match(/(?:^|\/)layout\/([^/]+)\.liquid$/);
  if (layoutMatch) {
    return `layout.${liquidBasenameToScope(layoutMatch[1])}`;
  }

  const templateMatch = normalized.match(/(?:^|\/)templates\/([^/]+)\.liquid$/);
  if (templateMatch) {
    return `templates.${liquidBasenameToScope(templateMatch[1])}`;
  }

  const snippetMatch = normalized.match(/(?:^|\/)snippets\/(.+)\.liquid$/);
  if (snippetMatch) {
    const parts = snippetMatch[1].split('/').map((part) => {
      const name = part.replace(/^_/, '');
      return liquidBasenameToScope(name);
    });
    return `snippets.${parts.join('.')}`;
  }

  const sectionMatch = normalized.match(/(?:^|\/)sections\/([^/]+)\.liquid$/);
  if (sectionMatch) {
    return `sections.${liquidBasenameToScope(sectionMatch[1])}`;
  }

  return null;
}

/** templates/page.style+variant.liquid -> page.style */
function liquidBasenameToScope(basename) {
  return basename.split('+')[0];
}

/**
 * 将以 . 开头的相对 key 解析为完整 key（与 localization_filter 一致）。
 * @param {string} key
 * @param {string} [filePath]
 */
function resolveI18nKey(key, filePath) {
  if (!key.startsWith('.')) return key;
  const scope = filePath ? i18nScopeFromFile(filePath) : null;
  if (!scope) return key;
  return `${scope}${key}`;
}

/** 取片段中最后一个引号字符串字面量（作为 t filter 的 key） */
function extractLastStringLiteral(segment) {
  const matches = [...segment.matchAll(/(['"])([^'"\\]*)\1/g)];
  if (!matches.length) return null;
  return matches[matches.length - 1][2];
}

/**
 * 解析 t filter 段中的默认翻译（第一个位置参数）。
 * 支持：| t、| t, url: x、| t: 'default'、| t: 'default', url: x、| t: '', 'arg'
 * 命名参数（url、locale 等）与后续位置参数不参与默认值提取。
 */
function parseTFilterDefault(tSegment) {
  const rest = tSegment.replace(/^t/, '').trim();
  if (!rest.startsWith(':')) return '';

  const afterColon = rest.slice(1).trim();
  if (!afterColon) return '';

  const quoted = afterColon.match(/^(['"])(.*?)\1/);
  if (quoted) return quoted[2];

  const numMatch = afterColon.match(/^(-?\d+(?:\.\d+)?)/);
  if (numMatch) return Number(numMatch[1]);

  return '';
}

/**
 * 提取内容中所有 {{ ... }} 和 {% ... %} 片段内的 t filter key。
 * 规则：| t、| t: 或 | t, ... 前最近的字符串字面量；相对 key（.开头）按文件路径展开。
 *
 * @param {string} content
 * @param {string} [filePath] - 模板文件路径，用于解析相对 key
 * @returns {Record<string, string|number>}
 */
function extractTKeys(content, filePath) {
  const result = {};
  const reg = /\{\{\s*([\s\S]*?)\s*\}\}|\{\%-?\s*([\s\S]*?)\s*-?%\}/g;
  let match;

  while ((match = reg.exec(content))) {
    const inner = match[1] !== undefined ? match[1] : match[2];
    if (!inner.includes('|')) continue;

    const parts = inner.split('|').map((p) => p.trim());
    let lastItem = '';

    for (let i = 0; i < parts.length; i++) {
      const str = parts[i];
      if (/^t(?=\s|:|,|$)/.test(str)) {
        const rawKey = extractLastStringLiteral(lastItem);
        if (rawKey) {
          const key = resolveI18nKey(rawKey, filePath);
          const defaultValue = parseTFilterDefault(str);
          if (!Object.prototype.hasOwnProperty.call(result, key)) {
            result[key] = defaultValue;
          }
        }
        lastItem = '';
      } else {
        lastItem = str;
      }
    }
  }

  return result;
}

/**
 * 提取 schema 区块中所有 value 为 t: 开头的 key，返回 { key: value } 对象，value 默认为空字符串。
 * 只处理 {% schema %} ... {% endschema %} 片段，内容需能被 JSON 解析。
 *
 * @param {string} content - 要分析的文本内容。
 * @returns {Object} 提取到的所有 schema key 对象。
 */
function extractSchemaTKeys(content) {
  const result = {};
  // 匹配所有 {% schema %} ... {% endschema %} 片段
  const schemaReg = /\{\%\s*schema\s*\%\}([\s\S]*?)\{\%\s*endschema\s*\%\}/g;
  let schemaMatch;
  while ((schemaMatch = schemaReg.exec(content))) {
    let schemaContent = schemaMatch[1];
    // 尝试 JSON 解析
    let schemaJson;
    try {
      schemaJson = JSON.parse(schemaContent);
    } catch (e) {
      continue; // 解析失败跳过
    }

    // 递归查找 value 字段
    function findValueKeys(obj) {
      if (Array.isArray(obj)) {
        obj.forEach(findValueKeys);
      } else if (obj && typeof obj === 'object') {
        for (const k in obj) {
          findValueKeys(obj[k]);
        }
      } else if (typeof obj === 'string' && obj.startsWith('t:')) {
        const key = obj.slice(2)
        if (key) result[key] = ''
      }
    }
    findValueKeys(schemaJson);
  }
  return result;
}


/**
 * 合并多语言对象，优先保留原始值（有值的不覆盖），递归处理嵌套结构
 * @param {object} origin 原始对象
 * @param {object} update 新对象
 * @returns {object} 合并后的对象
 */
function mergeLocaleObj(origin, update, structureOnly = false) {
  if (Array.isArray(update)) {
    if (!Array.isArray(origin)) {
      origin = []
    }

    // 合并数组每项, 可能需要每个元素相似度合并
    const updateSort = update.sort()
    const originSort = origin.sort()
    return updateSort.map((item, index) => {
      return mergeLocaleObj(originSort[index], item, structureOnly);
    });
  }

  if (isPlainObject(update)) {
    if (!isPlainObject(origin)) {
      origin = {}
    }

    const result = {};
    const keys = new Set([...Object.keys(origin), ...Object.keys(update)]);

    for (const key of keys) {
      result[key] = mergeLocaleObj(origin[key], update[key], structureOnly);
    }

    return result;
  }

  if (typeof origin === 'number') {
    return origin
  } else {
    return origin || (structureOnly ? '' : update) || ''
  }
}

/**
 * 综合提取内容中的所有多语言 key，包括普通 t key 和 schema key。
 * @param {string} content - 要分析的文本内容。
 * @returns {object} 提取到的所有 keys。
 */
function extractKeysFromContent(content, file) {
  let tKeys = {};
  let schemaKeys = {};
  if (file.endsWith('.json')) {
    // 递归查找所有 value 以 t: 开头的 key
    let jsonData;
    try {
      jsonData = JSON.parse(content);
    } catch (e) {
      return {};
    }
    function findTKeys(obj) {
      if (Array.isArray(obj)) {
        obj.forEach(findTKeys);
      } else if (obj && isPlainObject(obj)) {
        for (const k in obj) {
          findTKeys(obj[k]);
        }
      } else if (typeof obj === 'string' && obj.startsWith('t:')) {
        const key = obj.slice(2);
        if (key) schemaKeys[key] = '';
      }
    }
    findTKeys(jsonData);
  } else {
    tKeys = extractTKeys(content, file);
    schemaKeys = extractSchemaTKeys(content);
  }
  return mergeLocaleObj(tKeys, schemaKeys)
}

/**
 * 递归遍历目录，查找指定扩展名的所有文件。
 * @param {string} dir - 要遍历的目录。
 * @param {string[]} [exts=['.liquid', '.json']] - 需要查找的文件扩展名。
 * @returns {Promise<string[]>} 所有匹配文件的路径数组。
 */
async function walk(dir, exts = ['.liquid', '.json']) {
  let files = await fs.readdir(dir);
  let all = [];
  for (let f of files) {
    let fp = path.join(dir, f);
    let stat = await fs.stat(fp);
    if (stat.isDirectory()) {
      all = all.concat(await walk(fp, exts));
    } else if (exts.includes(path.extname(f))) {
      all.push(fp);
    }
  }
  return all;
}

/**
 * 根据 key 以 . 分割生成嵌套 JSON 结构
 * @param {object} obj - 目标对象
 * @param {string} key - 点分割的 key
 * @param {any} value - 赋值内容
 */
function setNestedKey(obj, key, value) {
  const parts = key.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/**
 * 提取所有 key 并生成 locales 目录下的多语言 key 文件。
 * 1. 提取key并区分 schema/normal
 * 2. 只更新 mainLanguage 的 xx.json/xx.schema.json
 * 3. 读取 mainLanguage 的 xx.json/xx.schema.json
 * 4. allLanguages 排除 mainLanguage，循环用 mainLanguage 的内容为基准合并并写入
 * 5. 写入时用 mergeLocaleObj 合并
 */

/**
 * 支持参数：{ cleanUnused }
 * cleanUnused: true 时，移除 locales 文件中未被源码引用的 key
 */
export default async function extractKeys(options = {}) {
  const { cleanUnused = false } = options;
  const config = await getConfig();
  const langs = await allLanguages(config);
  const mainLang = await mainLanguage(config);

  // 1. 提取key并区分，合并 value
  let schemaKeys = {};
  let normalKeys = {};
  const srcDirs = config.paths.source;
  for (let dir of srcDirs) {
    if (!fs.existsSync(dir)) continue;
    let files = await walk(dir);

    for (let file of files) {
      let content = await readFileSmart(file, 'user');
      let keys = extractKeysFromContent(content, file);
      // 分离 schema/normal，并递归合并 value
      const schemaPart = {};
      const normalPart = {};
      for (const k in keys) {
        if (k.startsWith('schema.')) {
          schemaPart[k.replace('schema.', '')] = keys[k];
        } else {
          normalPart[k] = keys[k];
        }
      }
      schemaKeys = mergeLocaleObj(schemaKeys, schemaPart);
      normalKeys = mergeLocaleObj(normalKeys, normalPart);
    }
  }

  // 2. 生成 mainLanguage 的 xx.json/xx.schema.json
  const localesDir = config.paths.locales;
  await fs.ensureDir(localesDir);

  // 生成 mainLanguage 的内容（嵌套结构）
  const mainNormalObj = {};
  Object.entries(normalKeys).forEach(([k, v]) => setNestedKey(mainNormalObj, k, v));
  const mainSchemaObj = {};
  Object.entries(schemaKeys).forEach(([k, v]) => setNestedKey(mainSchemaObj, k, v));

  // 3. 读取 mainLanguage 的原始文件
  let mainNormalOrigin = {};
  let mainSchemaOrigin = {};
  try {
    mainNormalOrigin = await fs.readJson(path.join(localesDir, `${mainLang}.json`));
  } catch {}
  try {
    mainSchemaOrigin = await fs.readJson(path.join(localesDir, `${mainLang}.schema.json`));
  } catch {}

  // 清理未使用的 key
  function cleanUnusedKeys(origin, usedObj) {
    // 递归清理 origin 中未在 usedObj 中出现的 key
    if (Array.isArray(origin)) {
      return origin.filter((item, idx) => usedObj && usedObj[idx] !== undefined)
    }
    if (isPlainObject(origin)) {
      const result = {};
      for (const k in origin) {
        if (usedObj && Object.prototype.hasOwnProperty.call(usedObj, k)) {
          result[k] = cleanUnusedKeys(origin[k], usedObj[k]);
        }
      }
      return result;
    }
    return origin;
  }

  let mainNormal = mergeLocaleObj(mainNormalOrigin, mainNormalObj);
  let mainSchema = mergeLocaleObj(mainSchemaOrigin, mainSchemaObj);
  if (cleanUnused) {
    mainNormal = cleanUnusedKeys(mainNormal, mainNormalObj);
    mainSchema = cleanUnusedKeys(mainSchema, mainSchemaObj);
  }
  await fs.writeJson(path.join(localesDir, `${mainLang}.json`), mainNormal, { spaces: 2 });
  await fs.writeJson(path.join(localesDir, `${mainLang}.schema.json`), mainSchema, { spaces: 2 });

  // 4. 其他语言用 mainLanguage 的内容为基准
  for (const lang of langs.filter(l => l !== mainLang)) {
    let normalOrigin = {};
    let schemaOrigin = {};
    try {
      normalOrigin = await fs.readJson(path.join(localesDir, `${lang}.json`));
    } catch {}
    try {
      schemaOrigin = await fs.readJson(path.join(localesDir, `${lang}.schema.json`));
    } catch {}

    let mergedNormalLang = mergeLocaleObj(normalOrigin, mainNormal, true);
    let mergedSchemaLang = mergeLocaleObj(schemaOrigin, mainSchema, true);
    if (cleanUnused) {
      mergedNormalLang = cleanUnusedKeys(mergedNormalLang, mainNormalObj);
      mergedSchemaLang = cleanUnusedKeys(mergedSchemaLang, mainSchemaObj);
    }
    await fs.writeJson(path.join(localesDir, `${lang}.json`), mergedNormalLang, { spaces: 2 });
    await fs.writeJson(path.join(localesDir, `${lang}.schema.json`), mergedSchemaLang, { spaces: 2 });
  }
  if (cleanUnused) {
    console.log('已清理未使用的多语言key，并提取至 locales 目录下');
  } else {
    console.log('已提取多语言key 至 locales 目录下');
  }
}

export {
  extractTKeys,
  extractSchemaTKeys,
  extractKeysFromContent,
  i18nScopeFromFile,
  resolveI18nKey,
  walk
};