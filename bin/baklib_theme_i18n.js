#!/usr/bin/env node
import { program } from 'commander';

program
  .name('baklib_theme_i18n')
  .description('Baklib 模版多语言翻译 CLI 工具')
  .version('1.0.0');

program
  .command('init')
  .description('初始化配置')
  .action(async () => (await import('../lib/core/init.js')).default());

program
  .command('gen-adapter <name>')
  .description('生成适配器模板')
  .action(async (name) => (await import('../lib/core/genAdapter.js')).default(name));

program
  .command('extract-langs')
  .description('提取 config 中定义的语言列表')
  .action(async () => (await import('../lib/core/extractLangs.js')).default());

program
  .command('extract-keys')
  .description('提取所有 key 并生成 locales 文件')
  .action(async () => (await import('../lib/core/extractKeys.js')).default());

program
  .command('translate')
  .description('执行翻译')
  .action(async (opts) => (await import('../lib/core/translate.js')).default(opts));

program.parse(process.argv);