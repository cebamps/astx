import { TransformOptions } from '../../src'
import { astxTestcase } from '../astxTestcase'
import dedent from 'dedent-js'

astxTestcase({
  file: __filename,
  input: dedent`
    import { foo as bar, qux } from 'foo'
    import { foo as baz } from 'baz'
  `,
  astx: ({ astx, report }: TransformOptions): void => {
    const result = astx.findImports`import { foo as $foo } from '$x'`
    for (const { $foo, $x } of result) report([$foo.code, $x.stringValue])
  },
  expectedReports: [
    ['bar', 'foo'],
    ['baz', 'baz'],
  ],
})
