import { NodePath, StringLiteral } from '../types'
import { CompileOptions, convertPredicateMatcher, CompiledMatcher } from '.'
import { compileStringCaptureMatcher, unescapeIdentifier } from './Capture'

export default function matchStringLiteral(
  path: NodePath<StringLiteral>,
  compileOptions: CompileOptions
): CompiledMatcher {
  const pattern: StringLiteral = path.node
  const captureMatcher = compileStringCaptureMatcher(
    path,
    (pattern) => pattern.value,
    compileOptions
  )

  if (captureMatcher) return captureMatcher

  pattern.value = unescapeIdentifier(pattern.value)

  return convertPredicateMatcher(
    path,
    {
      match: (path: NodePath): boolean => {
        const { node } = path

        return node?.type === 'StringLiteral' && pattern.value === node.value
      },
      nodeType: 'StringLiteral',
    },
    compileOptions
  )
}
