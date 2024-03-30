import { TransformOptions } from '../../src'
import { astxTestcase } from '../astxTestcase'
import dedent from 'dedent-js'

astxTestcase({
  file: __filename,
  input: dedent`
    import foo, {foob} from 'foo'
    import bar from 'bar'
  `,
  astx: ({ astx }: TransformOptions): void => {
    astx.replaceImport`import foo from 'foo'`.with`import { blah } from 'foo'`
  },
  expected: dedent`
    import { foob, blah } from 'foo'
    import bar from 'bar'
  `,
})
