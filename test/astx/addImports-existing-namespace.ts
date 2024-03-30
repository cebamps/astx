import { TransformOptions } from '../../src'
import { astxTestcase } from '../astxTestcase'
import dedent from 'dedent-js'

astxTestcase({
  file: __filename,
  input: dedent`
    import * as a from 'a'

    function foo() {

    }
  `,
  astx: ({ astx }: TransformOptions): void => {
    astx.addImports`
      import * as a from 'a'
    `
  },
  expected: dedent`
    import * as a from 'a'

    function foo() {

    }
  `,
})
