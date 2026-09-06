import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = readFileSync(new URL('../app/Handwriting.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
new Function('require', 'exports', compiled)(createRequire(import.meta.url), exports);

for (const subtract of [false, true]) {
  test(`initial ${subtract ? 'change' : 'total'} memo is blank with an opt-in hint`, () => {
    const html = renderToStaticMarkup(React.createElement(exports.default, {
      numbers: subtract ? [100, 79] : [34, 45], subtract,
    }));
    assert.match(html, /<canvas/);
    assert.match(html, /メモ欄/);
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, /ヒント/);
    assert.doesNotMatch(html, /class="writing-guide"|class="column-hint"/);
    assert.doesNotMatch(html, /<input/);
  });
}
