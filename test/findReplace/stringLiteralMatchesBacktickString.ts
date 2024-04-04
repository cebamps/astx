import { findReplaceTestcase } from '../findReplaceTestcase'
import dedent from 'dedent-js'

findReplaceTestcase({
  file: __filename,
  input: dedent`
    'foo'
    \`foo\`
    \`foo\${a}\`
    \`bar\`
  `,
  find: dedent`
    'foo' 
  `,
  expectedFind: [{ node: "'foo'" }, { node: '`foo`' }],
})
