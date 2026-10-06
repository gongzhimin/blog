import {
  buildHomepageConfigSchema,
  validateHomepageConfig,
} from '../internal/config/homepage-config.mjs';

/**
 * Return the generated editor schema and validation result for one config.
 * This narrow integration API is consumed by Tooling's reference generator.
 *
 * @param {object} config
 * @returns {{ok:true,schema:object}|{ok:false,schema:object,diagnostic:string}}
 */
export function inspectHomepageConfig(config) {
  const schema = buildHomepageConfigSchema();
  try {
    validateHomepageConfig(config);
    return { ok: true, schema };
  } catch (error) {
    return {
      ok: false,
      schema,
      diagnostic: error instanceof Error ? error.message : String(error),
    };
  }
}
