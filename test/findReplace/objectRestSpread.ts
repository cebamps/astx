export const input = `
const a = {
  foo: 'bar',
  baz: 'qux',
  glorm: {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
    ...qlom,
  }
}

const b = {
  foo: 'bar',
  baz: 'qux',
  glorm: {
    a: 1,
    c: 3,
  }
}
`

export const find = `{foo: 'bar', glorm: {a: 1, b: 2, ...$$inner}, ...$$outer}`

export const expectedFind = [
  {
    node: `{
  foo: 'bar',
  baz: 'qux',
  glorm: {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
    ...qlom,
  }
}`,
    arrayCaptures: {
      $$inner: ['c: 3', 'd: 4', '...qlom'],
      $$outer: ["baz: 'qux'"],
    },
  },
]

export const replace = `{foo: 'bar', ...$$outer, glorm: {a: 5, ...$$inner}}`

export const expectedReplace = `
const a = {
  foo: "bar",
  baz: 'qux',

  glorm: {
    a: 5,
    c: 3,
    d: 4,
    ...qlom,
  }
}

const b = {
  foo: 'bar',
  baz: 'qux',
  glorm: {
    a: 1,
    c: 3,
  }
}
`
import { findReplaceTestcase } from '../findReplaceTestcase'

findReplaceTestcase({
  file: __filename,
  input,
  find,
  expectedFind,
  replace,
  expectedReplace,
})
