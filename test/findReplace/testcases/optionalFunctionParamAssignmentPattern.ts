export const input = `
function x(bar) { }
function y(bar = 2) { }
function z(bar: number = 2) { }
function w(bar = 2, baz) { }
`

export const find = `
function $f($a = $Optional($b)) { }
`

export const expectedFind = [
  {
    captures: {
      $a: 'bar',
      $f: 'x',
    },
    node: 'function x(bar) { }',
  },
  {
    captures: {
      $a: 'bar',
      $b: '2',
      $f: 'y',
    },
    node: 'function y(bar = 2) { }',
  },
  {
    captures: {
      $a: 'bar: number',
      $b: '2',
      $f: 'z',
    },
    node: 'function z(bar: number = 2) { }',
  },
]
