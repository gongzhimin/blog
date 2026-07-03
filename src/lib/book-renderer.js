// Compatibility shim. New code should import from src/book/renderers.
export {
  renderMarkdown,
  stripLeadingTitle,
  romanTocPage,
} from "../book/renderers/markdown-renderer.mjs";
