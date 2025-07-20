import BaseAdapter from './base_adapter.js';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { RateLimiter } from 'limiter';
import { isPlainObject } from '../core/utils.js';
import { JSONFilePreset } from 'lowdb/node';
import path from 'path';

/**
 * 百度翻译适配器，继承自 BaseAdapter。
 * https://fanyi-api.baidu.com
 * https://fanyi-api.baidu.com/doc/21
 */
class BaiduAdapter extends BaseAdapter {
  static limiter = null;
  static db = null;
  static dbReady = false;

  /**
   * 初始化持久化缓存
   */
  static async initDB() {
    if (!BaiduAdapter.db) {
      const dbFile = path.resolve(process.cwd(), 'baidu-translate-cache.json');
      const defaultData = { cache: {} };
      BaiduAdapter.db = await JSONFilePreset(dbFile, defaultData);
      BaiduAdapter.dbReady = true;
    }
  }

  /**
   * 构造函数。
   * @param {Object} options - 适配器配置参数。
   * @param {string} options.appid - 百度翻译 appid。
   * @param {string} options.secretKey - 百度翻译密钥。
   * @param {string} [options.url] - API 地址。
   * @param {number} [options.qps] - QPS 限流（每秒请求数）。
   */
  constructor(options = {}) {
    super(options);
    this.appid = options.appid;
    this.secretKey = options.secretKey;
    this.url = options.url || 'https://fanyi-api.baidu.com/api/trans/vip/translate';
    this.qps = options.qps || 0.8;
    if (!BaiduAdapter.limiter) {
      console.log('init global limiter, qps:', this.qps);
      if (this.qps < 1) {
        // 低QPS，按间隔发1个
        const intervalMs = Math.round(1000 / this.qps);
        BaiduAdapter.limiter = new RateLimiter({ tokensPerInterval: 1, interval: intervalMs });
      } else {
        // 高QPS，1秒发qps个
        BaiduAdapter.limiter = new RateLimiter({ tokensPerInterval: this.qps, interval: 1000 });
      }
    }
  }

  /**
   * 调用百度翻译 API 进行翻译。
   * @param {Object} param0
   * @param {string} param0.text - 待翻译文本
   * @param {string} param0.from - 源语言
   * @param {string} param0.to - 目标语言
   * @param {Object} param0.langMap - 语言映射表
   * @returns {Promise<{source_lang:string,target_lang:string,source_text:string,translated_text:string}>}
   */
  async translate({ text, from, to, langMap }) {
    // 等待持久化缓存初始化
    if (!BaiduAdapter.dbReady) {
      await BaiduAdapter.initDB();
    }
    // 生成缓存 key
    const cacheKey = `${from}_${to}_${text}`;
    // 先查持久化缓存
    const db = BaiduAdapter.db;
    if (db && db.data && db.data.cache && db.data.cache[cacheKey]) {
      console.log('cache data:', db.data.cache[cacheKey])
      return db.data.cache[cacheKey];
    }
    if (!(isPlainObject(langMap) && Object.keys(langMap).length > 0)) {
      langMap = BaiduAdapter.langMap();
    }
    langMap = BaiduAdapter.normalizeLangMap(langMap)
    if (!text) return { source_lang: from, target_lang: to, source_text: text, translated_text: '' };

    const salt = Math.floor(Math.random() * 1_000_000_000).toString();
    const q = text;
    const appid = this.appid;
    const secretKey = this.secretKey;
    // 生成 sign
    const signStr = appid + q + salt + secretKey;
    const sign = crypto.createHash('md5').update(signStr).digest('hex');
    // 语言映射
    const fromKey = BaiduAdapter.normalizeLangKey(from);
    const toKey = BaiduAdapter.normalizeLangKey(to);
    const fromCode = langMap[fromKey] || from;
    const toCode = langMap[toKey] || to;

    // 构造参数
    const params = new URLSearchParams({
      q,
      from: fromCode,
      to: toCode,
      appid,
      salt,
      sign
    });
    const url = `${this.url}?${params.toString()}`;
    let translated_text = ''
    try {
      // QPS 限流（全局）
      await BaiduAdapter.limiter.removeTokens(1);
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.trans_result && data.trans_result[0]) {
        translated_text = data.trans_result[0].dst
        console.log('success:', new Date().getTime(), data)
      } else {
        console.log('BaiduAdapter error no dst:', data)
      }
    } catch (e) {
      console.log('BaiduAdapter error:', e)
    }
    const result = {
      source_lang: from,
      target_lang: to,
      source_text: text,
      translated_text: translated_text
    };
    // 只有成功的翻译结果才写入缓存和文件
    if (translated_text) {
      if (db && db.data && db.data.cache) {
        db.data.cache[cacheKey] = result;
        await db.write();
      }
    }
    return result;
  }

  /**
   * 规范化语言 key，将 - 替换为 _
   * @param {string} key
   * @returns {string}
   */
  static normalizeLangKey(key) {
    return (key || '').replace(/-/g, '_');
  }

  /**
   * 规范化整个 hash 的 key，将 - 替换为 _
   * @param {Object} hash
   * @returns {Object}
   */
  static normalizeLangMap(hash) {
    const result = {};
    for (const k in hash) {
      if (Object.prototype.hasOwnProperty.call(hash, k)) {
        result[this.normalizeLangKey(k)] = hash[k];
      }
    }
    return result;
  }

  /**
   * 获取百度适配器默认语言映射表，key 全部为 _ 格式
   */
  static langMap() {
    // baklib -> baidu
    return {
      "zh-CN": "zh",      // 简体中文
      "zh-TW": "cht",     // 繁體中文
      "zh-HK": "cht",     // 繁體中文
      "zh-MO": "cht",     // 繁體中文
      "zh-SG": "zh",      // 简体中文
      "en": "en",         // 英语
      "en-US": "en",      // 英语
      "en-GB": "en",      // 英语
      "en-AU": "en",      // 英语
      "en-CA": "en",      // 英语
      "en-NZ": "en",      // 英语
      "en-IE": "en",      // 英语
      "pt": "pt",         // 葡萄牙语
      "pt-BR": "pt",      // 葡萄牙语
      "pt-PT": "pt",      // 葡萄牙语
      "es": "spa",        // 西班牙语
      "es-ES": "spa",     // 西班牙语
      "es-MX": "spa",     // 西班牙语
      "es-AR": "spa",     // 西班牙语
      "fr": "fra",        // 法语
      "fr-FR": "fra",     // 法语
      "fr-CA": "fra",     // 法语
      "fr-BE": "fra",     // 法语
      "fr-CH": "fra",     // 法语
      "de": "de",         // 德语
      "de-DE": "de",      // 德语
      "de-AT": "de",      // 德语
      "de-CH": "de",      // 德语
      "ja": "jp",         // 日语
      "ko": "kor",        // 韩语
      "vi": "vie",        // 越南语
      "th": "th",         // 泰语
      "id": "id",         // 印尼语
      "ms": "may",        // 马来语
      "ar": "ara",        // 阿拉伯语
      "hi": "hi",         // 印地语
      "bn": "ben",        // 孟加拉语
      "ru": "ru",         // 俄语
      "tr": "tr"          // 土耳其语
    };
  }
}

export default BaiduAdapter;