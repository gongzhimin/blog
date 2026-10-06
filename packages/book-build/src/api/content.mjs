export {
  renderMarkdown,
  stripLeadingTitle,
} from '../internal/renderers/markdown-renderer.mjs';

import {
  renderMarkdown,
  stripLeadingTitle,
} from '../internal/renderers/markdown-renderer.mjs';

/** Render one article body after removing its duplicated leading title. */
export function renderArticle({ body, title }) {
  return renderMarkdown(stripLeadingTitle(body || '', title || ''));
}
