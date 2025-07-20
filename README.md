# Baklib Theme I18n CLI

一个专为 Baklib 主题开发的多语言翻译 CLI 工具，支持从 Liquid 模板和 schema 文件中提取翻译键，并生成多语言文件。

## 功能特性

- 🔍 **智能键提取**: 从 Liquid 模板中提取 `{{ "key" | t }}` 和 `{{ "key" | t: "default" }}` 格式的翻译键
- 📋 **Schema 支持**: 从 `{% schema %}` 区块中提取 `t:key` 格式的翻译键
- 🌍 **多语言生成**: 自动生成嵌套结构的 JSON 语言文件
- 🔧 **适配器系统**: 支持自定义翻译适配器，可扩展不同的翻译服务
- ⚙️ **灵活配置**: 支持用户自定义配置，自动回退到默认配置
- 🚀 **CLI 工具**: 提供完整的命令行界面

## 一、翻译 Key 与文件结构规范

### 1. 翻译文件格式

- 所有翻译文件采用 `.json` 格式。
- 翻译 key 使用链式命名，如：

```json
"templates.help-center-page.settings.show_list.label": "显示列表"
```

### 2. 翻译文件分类

| 文件名                 | 描述            | key 开头            |
| ---------------------- | --------------- | ------------------- |
| `language.schema.json` | schema 区块翻译 | `schema.` 开头      |
| `language.json`        | 非 schema 翻译  | 不以 `schema.` 开头 |

### 3. key 命名规范（约定）

- 所有 key 建议遵循：
  **目录/文件名 + 功能名 + 非重复 key 组合**
- 示例：
  `t:schema.templates.page.settings.show_list.label`
  代表：`templates/page.liquid` 中 `schema > settings > show_list > label`

---

## 二、语言配置

### 1. 支持语言

支持语言需与系统定义一致：

```ruby
Baklib::Application.config.global_locales
```

包括：

```json
{
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  "en": "English",
  "fr": "Français",
  ...
}
```

### 2. 当前模版语言来源

语言列表来源于 `config/settings_schema.json` 文件中的：

```json
{
  "name": "theme_info",
  "theme_languages": [
    { "name": "中文简体", "value": "zh-CN" },
    { "name": "English", "value": "en" }
  ]
}
```

## 三、安装

```bash
npm install -d baklib-theme-i18n-cli
```

或者使用 yarn：

```bash
yarn add baklib-theme-i18n-cli -d
```

## 四、快速开始

### 1. 初始化项目

```bash
npx baklib-theme-i18n-cli init
```

这会生成默认配置文件 `.baklib_theme_i18nrc.json`。

### 2. 生成适配器

```bash
npx baklib-theme-i18n-cli gen-adapter myAdapter
```

这会生成一个自定义适配器模板文件 `lib/translate_adapters/myAdapter.js`。

### 3. 提取翻译键

```bash
npx baklib-theme-i18n-cli extract-keys
```

从模板文件中提取所有翻译键并生成语言文件。

### 4. 执行翻译

```bash
npx baklib-theme-i18n-cli translate --adapter myAdapter
```

使用指定的适配器翻译语言文件。

## 五、配置说明

### 默认配置文件

```json
{
  "defaultLanguage": "zh-CN",
  "targetLanguages": ["en", "fr"],
  "adapterName": "baidu",
  "adapterOptions": {
    "url": "https://api.fanyi.baidu.com/api/trans/vip/translate",
    "appid": "your_app_id",
    "secretKey": "your_secret_key",
    "qps": 0.8
  },
  "paths": {
    "locales": "locales",
    "schema": "config/settings_schema.json",
    "source": ["templates", "layout", "snippets"]
  }
}
```

### 配置项说明

- `defaultLanguage`: 默认语言（源语言）
- `targetLanguages`: 目标语言列表（可选，为空时会从 schema 中提取）
- `paths.source`: 源文件目录列表
- `paths.locales`: 语言文件输出目录
- `paths.schema`: schema 文件路径
- `adapterName`: 内置适配器名称
- `adapterPath`: 自定义适配器文件路径
- `adapterOptions`: 适配器配置项

## 六、适配器开发

### 创建自定义适配器

1. 生成适配器模板：

```bash
npx baklib-theme-i18n-cli gen-adapter myCustomAdapter
```

2. 编辑生成的 `lib/translate_adapters/myCustomAdapter.js` 文件：

```javascript
import { Adapter } from "baklib-theme-i18n-cli";

class MyCustomAdapter extends Adapter {
  constructor(options = {}) {
    // from adapterOptions
    super(options);
    // 初始化配置
  }

  async translate({ text, from, to, langMap = {} }) {
    // 实现翻译逻辑
    const translatedText = await this.callTranslationAPI(text, from, to);

    return {
      source_lang: from,
      target_lang: to,
      source_text: text,
      translated_text: translatedText,
    };
  }

  async callTranslationAPI(text, from, to) {
    // 调用实际的翻译 API
    // 这里实现你的翻译逻辑
    return "xxx";
  }
}

export default MyCustomAdapter;
```

3. 在配置文件中指定适配器：

```json
{
  "adapterName": null,
  "adapterPath": "lib/translate_adapters/myCustomAdapter.js",
  "adapterOptions": {
    // ...options
  }
  // ...other
}
```

### 内置适配器

- `baidu`: 百度翻译 API

## 七、支持的翻译键格式

### Liquid 模板

```liquid
{{ "hello" | t }}
{{ "welcome" | t: "Welcome" }}
{{ "user.name" | t: "User Name" }}
```

### Schema 区块

```json
{
  "name": "theme_info",
  "theme_languages": [{ "value": "en" }, { "value": "fr" }]
}
```

在 schema 的其他部分：

```json
{
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "t:section.title",
      "default": "t:section.title_default"
    }
  ]
}
```

## 八、生成的文件结构

```
locales/
├── zh-CN.json         # 中文语言文件
├── zh-CN.schema.json  # schema类型中文语言文件
├── en.json            # 英文翻译文件
├── en.schema.json            # schema类型英文翻译文件
└── ...
```

### 嵌套键结构

对于包含点的键名，会自动生成嵌套结构：

```json
{
  "user": {
    "name": "User Name", // {{ 'user.name' | t }}
    "email": "Email Address" // {% 'user.email' | t %}
  },
  "product": {
    "title": "Product Title"
  }
}
```

## 九、命令行选项

### extract-keys

提取翻译键并生成语言文件。

### translate

执行翻译操作。

选项：

- `--adapter <adapter>`: 指定适配器名称或路径
- `--config <config>`: 指定配置文件路径

### extract-langs

从 schema 文件中提取语言列表。

### gen-adapter <name>

生成适配器模板文件。

### init

初始化项目配置文件。

## 十、开发

### 安装依赖

```bash
yarn install
```

### 运行测试

```bash
yarn test
```

## 十一、许可证

MIT License

## 十二、贡献

欢迎提交 Issue 和 Pull Request！
