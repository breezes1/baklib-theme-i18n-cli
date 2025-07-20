/**
 * 适配器基类，所有翻译适配器需继承此类。
 */
class BaseAdapter {
  /**
   * 构造函数。
   * @param {Object} options - 适配器配置参数。
   */
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 翻译接口，需子类实现具体逻辑。
   * @param {Object} param0
   * @param {string} param0.text - 待翻译文本
   * @param {string} param0.from - 源语言
   * @param {string} param0.to - 目标语言
   * @param {Object} param0.langMap - 语言映射表
   * @returns {Promise<{source_lang:string,target_lang:string,source_text:string,translated_text:string}>}
   */
  async translate({ text, from, to, langMap = {} }) {
    return {
      source_lang: from,
      target_lang: to,
      source_text: text,
      translated_text: "翻译结果"
    };
  }
}

export default BaseAdapter;