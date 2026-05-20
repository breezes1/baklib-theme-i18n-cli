import test from 'node:test'
import assert from 'node:assert/strict'
import { extractTKeys, extractKeysFromContent, i18nScopeFromFile, resolveI18nKey } from '../lib/core/extractKeys.js'

/**
 * 针对 ThemeEngine LocalizationFilter 的 t filter 用法做专项测试。
 * @see localization_filter.rb
 */

test('t filter: 无默认值的命名参数 | t, url:', () => {
  const content = `{{ 'templates.page.llm_prompt_template' | t, url: page.markdown_url }}`
  assert.deepEqual(extractTKeys(content), {
    'templates.page.llm_prompt_template': ''
  })
})

test('t filter: 默认值 + 命名参数 | t: default, url:', () => {
  const content = `{{ 'templates.page.llm_prompt_template' | t: 'Read from %{url}', url: page.markdown_url }}`
  assert.deepEqual(extractTKeys(content), {
    'templates.page.llm_prompt_template': 'Read from %{url}'
  })
})

test("t filter: 空字符串默认值 | t: '', url:", () => {
  const content = `{{ 'layout.theme.hello' | t: '', url: page.url }}`
  assert.deepEqual(extractTKeys(content), {
    'layout.theme.hello': ''
  })
})

test('t filter: 位置参数 | t: default, positional', () => {
  const content = `{{ 'layout.theme.hello' | t: 'hello: %s', '张三' }}`
  assert.deepEqual(extractTKeys(content), {
    'layout.theme.hello': 'hello: %s'
  })
})

test('t filter: 相对 key 在 snippets/_header.liquid', () => {
  const file = 'snippets/_header.liquid'
  const content = `{{ '.hello' | t }}`
  assert.deepEqual(extractTKeys(content, file), {
    'snippets.header.hello': ''
  })
})

test('t filter: locale 命名参数不影响 key 提取', () => {
  const content = `{{ 'hello' | t: '你好', locale: 'de' }}`
  assert.deepEqual(extractTKeys(content), { hello: '你好' })
})

test('extractKeysFromContent: HTML data 属性中的 t filter', () => {
  const html = `data-page-tools-llm-prompt-value="{{ 'templates.page.llm_prompt_template' | t, url: page.markdown_url }}"`
  const keys = extractKeysFromContent(html, 'templates/page.liquid')
  assert.deepEqual(keys, { 'templates.page.llm_prompt_template': '' })
})

test('resolveI18nKey: 非相对 key 保持不变', () => {
  assert.equal(
    resolveI18nKey('templates.page.llm_prompt_template', 'templates/page.liquid'),
    'templates.page.llm_prompt_template'
  )
})

test('i18nScopeFromFile: layout 与 templates', () => {
  assert.equal(i18nScopeFromFile('layout/theme.liquid'), 'layout.theme')
  assert.equal(i18nScopeFromFile('templates/page.style.liquid'), 'templates.page.style')
})
