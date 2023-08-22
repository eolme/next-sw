/* eslint-disable @typescript-eslint/consistent-type-imports, @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error */

export type LooseExtend<L, T> = 0 extends (1 & L) ? T : L & T;

export type NextConfig = import('next').NextConfig;
export type Webpack = typeof import('webpack');

export type NextConfigContext = {
  isServer: boolean;
  dev: boolean;
  webpack?: Webpack;
};

export type WebpackStats = InstanceType<Webpack['Stats']>;
export type WebpackCompiler = InstanceType<Webpack['Compiler']>;
export type WebpackDefinePlugin = Webpack['DefinePlugin'];

export type WebpackConfiguration = Parameters<Webpack>[0][0];
export type WebpackResolveOptions = NonNullable<WebpackConfiguration['resolve']>;

export type WebpackLoaderContext<T> = {
  getOptions: () => T;
};

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
  dest: string;
  define: InstanceType<WebpackDefinePlugin>;
  defines: Record<string, string>;
  resolve: WebpackResolveOptions;
  sideEffects: SideEffects;
};

export type ServiceWorkerBuildCallback = (stats: WebpackStats) => void;

export type ServiceWorkerConfig = {
  name?: string;
  entry?: string;
  livereload?: boolean;
  sideEffects?: SideEffects;
  resolve?: boolean | 'force';
  port?: number;
};

export type NextConfigTyped = {
  basePath?: string;
  webpack?: (config: WebpackConfiguration, context: NextConfigContext) => WebpackConfiguration;
};

export type NextConfigLoose = LooseExtend<NextConfig, NextConfigTyped>;

export type WebpackRecompilation = {
  status: boolean;
  hash: string | null | undefined;
  error: string;
};
