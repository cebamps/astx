export const input = `
function foo() { return 2 }
`

export const find = `function $a() { return $b }`

export const expectedFind = [
  {
    node: `function foo() { return 2 }`,
    captures: { $a: 'foo', $b: '2' },
  },
]
