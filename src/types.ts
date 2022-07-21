/* eslint-disable @typescript-eslint/consistent-type-imports, @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error */

export type LooseExtend<L, T> = 0 extends (1 & L) ? T : L & T;

// @ts-ignore unresolved
export type NextConfig = import('next').NextConfig;

// @ts-ignore unresolved
export type WebpackConfiguration = import('webpack').Configuration;

// @ts-ignore unresolved
export type WebpackStats = import('webpack').Stats;

// @ts-ignore unresolved
export type WebpackCompiler = import('webpack').Compiler;

// @ts-ignore unresolved
export type WebpackPluginInstance = import('webpack').WebpackPluginInstance;

// @ts-ignore unresolved
export type WebpackResolveOptions = import('webpack').ResolveOptions;

// @ts-ignore unresolved
export type WebpackLoaderContext<T> = import('webpack').LoaderContext<T>;

export type WebpackCallback = (err?: Error, stats?: WebpackStats) => void;
export type WebpackFunction = (options: WebpackConfiguration, callback?: WebpackCallback) => WebpackCompiler;

export type ChalkFunction = (str: string) => string;

export type AnyFunction = (...args: any[]) => any;

export type AccessError = {
  code: string;
  path: string;
};

type SideEffects = boolean | string | RegExp | string[] | RegExp[] | ((file: string) => boolean);

export type ServiceWorkerBuildConfig = {
  dev: boolean;
  name: string;
  entry: string;
  public: string;
  define: WebpackPluginInstance;
  resolve: WebpackResolveOptions;
  sideEffects: SideEffects;
};

export type ServiceWorkerBuildCallback = (stats: WebpackStats) => void;

export type ServiceWorkerConfig = {
  name?: string;
  entry?: string;
  livereload?: boolean;
  sideEffects?: SideEffects;
};

export type NextConfigTyped = {
  basePath?: string;
  webpack?: (config: WebpackConfiguration, context: { isServer: boolean; dev: boolean }) => WebpackConfiguration;
};

export type NextConfigLoose = LooseExtend<NextConfig, NextConfigTyped>;
