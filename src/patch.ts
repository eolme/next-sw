import type { WebpackResolveOptions } from './types.js';

const EXTENSIONS = ['.js', '.mjs', '.ts'];
const WORKER = ['webworker', 'worker'];

export const patchResolve = (resolve: WebpackResolveOptions, force: boolean) => {
  if (Array.isArray(resolve.extensions)) {
    resolve.extensions = resolve.extensions.filter((ext) => EXTENSIONS.some((allowed) => ext.endsWith(allowed)));
  } else {
    resolve.extensions = EXTENSIONS;
  }

  // Patch mainFields
  if (Array.isArray(resolve.mainFields)) {
    resolve.mainFields = WORKER.concat(resolve.mainFields.flat());
  }

  // Patch aliasFields
  if (Array.isArray(resolve.aliasFields)) {
    resolve.aliasFields = WORKER.concat(resolve.aliasFields.flat());
  }

  // Patch conditionNames
  if (Array.isArray(resolve.conditionNames) && (force || resolve.conditionNames.length > 0)) {
    resolve.conditionNames = WORKER.concat(resolve.conditionNames);
  }

  // Patch exportsFields
  if (Array.isArray(resolve.exportsFields) && (force || resolve.exportsFields.length > 0)) {
    resolve.exportsFields = WORKER.concat(resolve.exportsFields);
  }

  return resolve;
};
