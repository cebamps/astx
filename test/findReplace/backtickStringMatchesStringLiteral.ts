import { findReplaceTestcase } from '../findReplaceTestcase'
import dedent from 'dedent-js'

findReplaceTestcase({
  file: __filename,
  input: dedent`
    'foo'
    \`foo\`
    'bar'
  `,
  find: dedent`
    \`foo\`
  `,
  expectedFind: [{ node: "'foo'" }, { node: '`foo`' }],
})
