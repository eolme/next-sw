import type { WebpackResolveOptions } from './types';

const EXTENSIONS = ['.js', '.mjs', '.ts'];

export const patchResolve = (resolve: WebpackResolveOptions, force: boolean) => {
  if (Array.isArray(resolve.extensions)) {
    resolve.extensions = resolve.extensions.filter((ext) => EXTENSIONS.some((allowed) => ext.endsWith(allowed)));
  } else {
    resolve.extensions = EXTENSIONS;
  }

  // Patch mainFields
  if (Array.isArray(resolve.mainFields)) {
    resolve.mainFields = ['worker'].concat(resolve.mainFields.flat());
  }

  // Patch aliasFields
  if (Array.isArray(resolve.aliasFields)) {
    resolve.mainFields = ['worker'].concat(resolve.aliasFields.flat());
  }

  // Patch conditionNames
  if (Array.isArray(resolve.conditionNames) && (force || resolve.conditionNames.length > 0)) {
    resolve.conditionNames = ['worker'].concat(resolve.conditionNames);
  }

  // Patch exportsFields
  if (Array.isArray(resolve.exportsFields) && (force || resolve.exportsFields.length > 0)) {
    resolve.conditionNames = ['worker'].concat(resolve.exportsFields);
  }

  // Patch importsFields
  if (Array.isArray(resolve.importsFields) && (force || resolve.importsFields.length > 0)) {
    resolve.conditionNames = ['worker'].concat(resolve.importsFields);
  }
};
