import { ApiError } from '../utils/ApiError.js';
 
/**
 * Validate a request part against a Zod schema.
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'query'|'params'} source
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    // Replace with parsed (coerced/defaulted) data
    req[source] = result.data;
    next();
  };
}
