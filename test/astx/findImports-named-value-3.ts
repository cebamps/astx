import { TransformOptions } from '../../src'
import { astxTestcase } from '../astxTestcase'
import dedent from 'dedent-js'

astxTestcase({
  file: __filename,
  // parsers: ['babel/tsx'],
  input: dedent`
    import type {foo as qux} from 'foo'
    import Foo, {foo as bar, baz} from 'foo' 
  `,
  astx: ({ astx, report }: TransformOptions): void => {
    report(astx.findImports`import { default as $f } from 'foo'`.$f.code)
  },
  expectedReports: ['Foo'],
})
