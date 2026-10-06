import type { BookDocument, BookRuntimeConfig } from '@myblog/book-build';

export type HomepageConfigInspection =
  | { ok: true; schema: Record<string, unknown> }
  | { ok: false; schema: Record<string, unknown>; diagnostic: string };

export type SiteDiagnostic = {
  code: string;
  phase: string;
  message: string;
};

export type SiteHomepageModel = {
  document: BookDocument;
  runConfig: BookRuntimeConfig;
  homepageStyles: string;
  quote: { english: string; chinese: string; author: string };
};

export type SiteHomepageInput = {
  lifePosts: object[];
  blogPosts: object[];
  bookConfig: Record<string, any>;
  dailyQuote?: { english?: string; chinese?: string; author?: string } | null;
  theme: {
    runtime: { id: string; [key: string]: unknown };
    styles: Record<string, string>;
    measurement: { articleCSS: string; tocCSS: string };
  };
};

export type SiteHomepageResult =
  | { ok: true; value: SiteHomepageModel }
  | { ok: false; diagnostics: SiteDiagnostic[] };

/** Compose collection policy, book payload, page styles and quote fallback. */
export function buildHomepageModel(
  input: SiteHomepageInput,
): SiteHomepageResult;

/** Build the legacy homepage editor schema and validate one configuration. */
export function inspectHomepageConfig(
  config: Record<string, unknown>,
): HomepageConfigInspection;
