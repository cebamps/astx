export const input = `
type Foo<W, X, Y, Z> = [W, X, Y, Z]
type Bar<A, B, C> = [A, B, C]
`

export const find = `type Foo<$a, $_b, Z> = $c`

export const expected = [
  {
    node: 'type Foo<W, X, Y, Z> = [W, X, Y, Z]',
    captures: {
      $a: 'W',
      $c: '[W, X, Y, Z]',
    },
    arrayCaptures: {
      $_b: ['X', 'Y'],
    },
  },
]
