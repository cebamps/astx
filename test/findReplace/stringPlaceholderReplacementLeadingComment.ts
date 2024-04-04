import { findReplaceTestcase } from '../findReplaceTestcase'
import dedent from 'dedent-js'

findReplaceTestcase({
  file: __filename,
  input: dedent`
    t.number()
    t.string('foo')
  `,
  find: dedent`
    t.string('$s')
  `,
  replace: dedent`
    // this is a test 
    $s
  `,
  expectedReplace: dedent`
    t.number()
    // this is a test
    'foo'
  `,
})
