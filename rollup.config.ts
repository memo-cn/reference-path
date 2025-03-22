import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
// import terser from '@rollup/plugin-terser';
import ts from 'rollup-plugin-typescript2';
import { defineConfig, OutputOptions, RollupOptions } from 'rollup';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg: typeof import('./package.json') = require('./package.json');

const sourcemap = true;
const input = './lib/index.ts';
const external = Object.keys(pkg.dependencies);

export default defineConfig(function (commandLineArguments) {
    if (commandLineArguments.watch) {
    }
    return rollupOptions;
});

const plugins = {
    babel: babel({
        babelHelpers: 'bundled',
        minified: true,
        comments: false,
        sourceMaps: sourcemap,
        presets: [
            [
                '@babel/preset-env',
                {
                    shippedProposals: true,
                },
            ],
        ],
    }),
    commonjs: commonjs({
        sourceMap: sourcemap,
    }),
    dts: dts(),
    json: json(),
    nodeResolve: nodeResolve(),
    replace: replace({
        preventAssignment: true,
        values: {},
        sourceMap: sourcemap,
    }),
    terser: null,
    // terser: terser({
    //     sourceMap: sourcemap,
    // }),
    ts: (() => {
        const targets = ['es5', 'esnext'] as const;
        return Object.fromEntries(
            targets.map((target) => [
                target,
                ts({
                    tsconfigOverride: {
                        compilerOptions: {
                            target,
                        },
                    },
                }),
            ]),
        ) as {
            [K in (typeof targets)[number]]: ReturnType<typeof ts>;
        };
    })(),
};

const rollupOptions: RollupOptions[] = [
    /** 声明文件 */
    {
        input,
        output: [
            {
                file: pkg.types,
            },
        ],
        plugins: [plugins.dts, plugins.nodeResolve, plugins.json, plugins.commonjs],
        external,
    } satisfies RollupOptions,
    ...(
        [
            {
                format: 'es',
                file: pkg.module,
            },
            {
                format: 'commonjs',
                file: pkg.main,
            },
        ] satisfies Pick<OutputOptions, 'format' | 'file'>[]
    ).map(({ format, file }) => {
        return {
            plugins: [
                plugins.replace,
                plugins.nodeResolve,
                plugins.json,
                plugins.commonjs,
                plugins.terser,
                format === 'es' ? plugins.ts.esnext : plugins.ts.es5,
                format === 'es' ? null : plugins.babel,
            ],
            input,
            external,
            output: [
                {
                    format,
                    file,
                    sourcemap,
                },
            ],
        } satisfies RollupOptions;
    }),
].filter((e) => e);
