import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../api/book-config.schema.json' with { type: 'json' };

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(
  schema,
);

/**
 * 使用权威 JSON Schema（Draft 2020-12）对书籍与翻页运行时配置对象进行静态强校验。
 *
 * @param {unknown} config 待校验的配置对象
 * @returns {Record<string, any>} 校验通过后的配置对象本身
 * @throws {Error} 当配置缺少必填属性、数值超出范围或类型不匹配时抛出包含所有违规字段路径的合并异常
 */
export function validateBookConfig(config) {
  if (!validate(config)) {
    const errors = validate.errors.map((error) => {
      const base = error.instancePath.split('/').filter(Boolean).join('.');
      const field = error.params.missingProperty;
      const path = field ? [base, field].filter(Boolean).join('.') : base;
      return error.keyword === 'required'
        ? path + ' is required'
        : path + ' ' + error.message;
    });
    throw new Error(errors.join('; '));
  }
  return config;
}
