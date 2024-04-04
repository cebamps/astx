import { findReplaceTestcase } from '../findReplaceTestcase'
import dedent from 'dedent-js'

findReplaceTestcase({
  file: __filename,
  input: dedent`
    const a = 1 + 2
  `,
  find: dedent`
    $a + $b 
  `,
  replace: dedent`
    // this is a test 
    $b + $a
  `,
  expectedReplace: dedent`
    const a = 2 + 1 // this is a test
  `,
})
