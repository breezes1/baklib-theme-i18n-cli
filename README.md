# Baklib Theme I18n CLI

一个专为 Baklib 主题开发的多语言翻译 CLI 工具，支持从 Liquid 模板和 schema 文件中提取翻译键，并生成多语言文件。

## 功能特性

- 🔍 **智能键提取**: 从 Liquid 模板提取 `t` filter 翻译键（含 `| t`、`| t: default`、`| t, url: ...` 及相对 key `.hello`）
- 🧹 **清理未使用 key**: `extract-keys --clean-unused` 移除 locales 中未被源码引用的条目
- 📋 **Schema 支持**: 从 `{% schema %}` 区块中提取 `t:key` 格式的翻译键
- 🌍 **多语言生成**: 自动生成嵌套结构的 JSON 语言文件
- 🔧 **适配器系统**: 支持自定义翻译适配器，可扩展不同的翻译服务
- ⚙️ **灵活配置**: 支持用户自定义配置，自动回退到默认配置
- 🚀 **CLI 工具**: 提供完整的命令行界面

## 翻译 Key 与文件结构规范

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

## 语言配置

### 1. 支持语言

支持语言需与系统定义一致,包括：

```json
{
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
```

### 2. 模版配置的语言列表

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

## 安装

```bash
npm install -d baklib-theme-i18n-cli
```

或者使用 yarn：

```bash
yarn add baklib-theme-i18n-cli -d
```

## 快速开始

### 1. 初始化项目
初始化项目配置文件。
```bash
npx baklib-theme-i18n-cli init
```

这会生成默认配置文件 `.baklib_theme_i18nrc.json`。生成后，请配置相关的值

### 2. 查看schema文件中配置的语言列表（可选）
从 schema 文件中查看语言列表。`extract-langs`

### 3. 生成适配器（可选）
生成适配器模板文件。 `gen-adapter <name>`

```bash
npx baklib-theme-i18n-cli gen-adapter myAdapter
```

这会生成一个自定义适配器模板文件 `lib/translate_adapters/myAdapter.js`。

### 4. 提取翻译键

```bash
npx baklib-theme-i18n-cli extract-keys
```

从模板文件中提取所有翻译键并生成语言文件。

清理 locales 中未被源码引用的 key（请确认 locales 已提交版本控制后再执行）：

```bash
npx baklib-theme-i18n-cli extract-keys --clean-unused
```

### 5. 执行翻译
```bash
npx baklib-theme-i18n-cli translate
```

使用指定的适配器翻译语言文件。

## 配置说明

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

## 适配器开发

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

## 支持的翻译键格式

提取规则与 Baklib ThemeEngine 的 `t` filter（`localization_filter.rb`）保持一致。

### Liquid 模板

```liquid
{# 仅 key，无默认值 #}
{{ "hello" | t }}

{# 带默认翻译 #}
{{ "welcome" | t: "Welcome" }}

{# 命名参数（如 url、locale），无位置默认值 #}
{{ "templates.page.llm_prompt_template" | t, url: page.markdown_url }}

{# 默认翻译 + 命名参数 #}
{{ "templates.page.llm_prompt_template" | t: "Read from %{url}", url: page.markdown_url }}

{# 默认翻译 + 位置占位符参数 #}
{{ "layout.theme.hello" | t: "hello: %s", "张三" }}

{# 指定语言 #}
{{ "hello" | t: "你好", locale: "de" }}

{# 相对 key：按当前模板文件路径展开（与运行时 i18n_scope 一致） #}
{# templates/page.liquid 中 .llm_prompt_template -> templates.page.llm_prompt_template #}
{{ ".llm_prompt_template" | t, url: page.markdown_url }}

{# assign 语句 #}
{% assign title = "generic.empty.title" | t: "没有找到相关内容" %}

{# HTML 属性内的 output 标签同样支持 #}
<div data-prompt="{{ 'templates.page.llm_prompt_template' | t, url: page.markdown_url }}"></div>
```

**相对 key 与文件路径对应关系**

| 模板文件 | `i18n_scope` | `{{ '.foo' | t }}` 展开为 |
| -------- | ------------ | ------------------------- |
| `templates/page.liquid` | `templates.page` | `templates.page.foo` |
| `layout/theme.liquid` | `layout.theme` | `layout.theme.foo` |
| `snippets/_header.liquid` | `snippets.header` | `snippets.header.foo` |

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

## 生成的文件结构

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

## 开发

### 安装依赖

```bash
yarn install
```

### 运行测试

```bash
yarn test
```

### 在主题项目中使用本地 CLI（联调）

开发本仓库时，通常需要在**某个 Baklib 主题项目**里验证 `extract-keys`、`translate` 等命令。请在**主题项目根目录**执行 CLI（工具会读取该目录下的 `.baklib_theme_i18nrc.json`）。

以下任选一种方式，将依赖指向本机 `baklib-theme-i18n-cli` 源码目录。

#### 方式一：`package.json` 本地路径（推荐）

在主题项目的 `package.json` 中：

```json
{
  "devDependencies": {
    "baklib-theme-i18n-cli": "file:../baklib-theme-i18n-cli"
  },
  "scripts": {
    "i18n:extract": "baklib_theme_i18n extract-keys",
    "i18n:extract:clean": "baklib_theme_i18n extract-keys --clean-unused",
    "i18n:translate": "baklib_theme_i18n translate"
  }
}
```

`../baklib-theme-i18n-cli` 请按实际相对路径调整。安装依赖后：

```bash
cd /path/to/your-theme
yarn install          # 或 npm install
yarn i18n:extract     # 使用本地链接的 CLI
```

修改 CLI 源码后，在主题项目中重新执行命令即可生效（`file:` 协议会指向当前目录，无需重新 publish）。

#### 方式二：`npm link` / `yarn link`

```bash
# 1. 在 CLI 仓库根目录注册全局 link
cd /path/to/baklib-theme-i18n-cli
yarn link               # 或 npm link

# 2. 在主题项目中链接
cd /path/to/your-theme
yarn link baklib-theme-i18n-cli   # 或 npm link baklib-theme-i18n-cli

# 3. 在主题项目根目录执行
npx baklib-theme-i18n-cli extract-keys
```

取消链接：`yarn unlink baklib-theme-i18n-cli`（主题项目）/ `yarn unlink`（CLI 仓库）。

#### 方式三：直接调用 bin（不改 package.json）

适合临时跑一次，主题项目无需安装依赖：

```bash
cd /path/to/your-theme

# 使用 node 执行本地 bin
node /path/to/baklib-theme-i18n-cli/bin/baklib_theme_i18n.js extract-keys

# 或使用 npx 指向本地目录
npx --prefix /path/to/baklib-theme-i18n-cli baklib-theme-i18n-cli extract-keys --clean-unused
```

#### 联调检查清单

1. 主题项目已执行 `baklib-theme-i18n-cli init`，存在 `.baklib_theme_i18nrc.json`
2. `paths.source` 包含实际模板目录（如 `templates`、`layout`、`snippets`）
3. 命令在主题项目根目录执行（`process.cwd()` 为配置与 locales 的基准路径）
4. 修改 CLI 后跑 `yarn test`；再在主题项目中执行 `extract-keys` 验证

### 发布

```bash
npm publish
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
