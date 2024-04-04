import { findReplaceTestcase } from '../findReplaceTestcase'
import dedent from 'dedent-js'

findReplaceTestcase({
  file: __filename,
  input: dedent`
    'foo'
    \`bar\`
  `,
  find: dedent`
    \`$s\`
  `,
  expectedFind: ["'foo'", '`bar`'].map((node) => ({
    node,
    captures: { $s: node },
    stringCaptures: { $s: node.substring(1, node.length - 1) },
  })),
})
