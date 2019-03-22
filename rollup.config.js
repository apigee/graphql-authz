// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import {uglify} from "rollup-plugin-uglify";


let pretty = process.env.pretty || false;

let common = {
    plugins: [
        babel({
            runtimeHelpers: true,
            "presets": [
                ["@babel/env"]
            ],
            plugins: [
                ["babel-plugin-add-module-exports"],
                ["transform-inline-environment-variables", {"include": ["NODE_ENV"]}]]
        }),

        resolve(),
        commonjs(),
        pretty ? {} : uglify(),
    ]
};

let library = {
    input: './lib/graphql.js',
    output: {
        file: './dist/graphql.lib.js',
        format: 'iife',
        name: 'graphql',
        exports: 'named',
    },
};


let jsc = {
    input: './graphql.jsc.js',
    output: {
        file: './dist/graphql.jsc.js',
        format: 'iife',
        name: "graphql_authz",
        exports: 'named',
        intro: "function Main(exports) {\n'use strict;'",
        outro: "}\n Main(exports);"
    }
};


export default [
    Object.assign({}, library, common),
    Object.assign({}, jsc, common)
]