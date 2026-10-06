import { createClassicPaperTheme } from './classic-paper/theme.mjs';
import { createPlainManuscriptTheme } from './plain-manuscript/theme.mjs';

const THEME_FACTORIES = {
  'classic-paper': createClassicPaperTheme,
  'plain-manuscript': createPlainManuscriptTheme,
};

/**
 * 枚举系统当前已注册的所有内置书籍主题标识符。
 *
 * @returns {string[]} 主题标识符数组（如 ['classic-paper', 'plain-manuscript']）
 */
export function listBookThemeIds() {
  return Object.keys(THEME_FACTORIES);
}

/**
 * 加载并初始化指定标识符的书籍主题。
 *
 * @param {string} [themeId='classic-paper'] 主题标识符
 * @param {Record<string, unknown>} [sharedSources={}] 共享资源配置（如字体/样式前缀映射）
 * @returns {import('../../api/types.mjs').BookTheme}
 * @throws {Error} 当传入未知的主题标识符时抛出
 */
export function loadBookTheme(themeId = 'classic-paper', sharedSources = {}) {
  const id = themeId || 'classic-paper';
  const factory = THEME_FACTORIES[id];
  if (!factory) {
    throw new Error(`Unknown book theme: ${id}`);
  }
  return factory(sharedSources);
}
