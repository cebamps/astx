export const input = `
const foo = require('foo')
const bar = require('bar')
const baz = require('baz' + 'qux')
const {glom, qlx} = require('foo')
const {bar: barr, default: qux} = require('bar')
`
export const find = `const $1 = require('$a')`

export const expectedFind = [
  {
    node: "const foo = require('foo')",
    captures: {
      $1: 'foo',
    },
    stringCaptures: {
      $a: 'foo',
    },
  },
  {
    node: "const bar = require('bar')",
    captures: {
      $1: 'bar',
    },
    stringCaptures: {
      $a: 'bar',
    },
  },
  {
    captures: {
      $1: '{glom, qlx}',
    },
    node: "const {glom, qlx} = require('foo')",
    stringCaptures: {
      $a: 'foo',
    },
  },
  {
    captures: {
      $1: '{bar: barr, default: qux}',
    },
    node: "const {bar: barr, default: qux} = require('bar')",
    stringCaptures: {
      $a: 'bar',
    },
  },
]

export const replace = `import $1 from '$a'`

export const expectedReplace = `
import foo from 'foo'
import bar from 'bar'
const baz = require('baz' + 'qux')
import {glom, qlx} from 'foo'
import qux, {bar as barr} from 'bar'
`
