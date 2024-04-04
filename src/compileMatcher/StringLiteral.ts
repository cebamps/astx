import { NodePath, StringLiteral } from '../types'
import { CompileOptions, convertPredicateMatcher, CompiledMatcher } from '.'
import {
  compileStringPlaceholderMatcher,
  unescapeIdentifier,
} from './Placeholder'

export default function matchStringLiteral(
  path: NodePath<StringLiteral, StringLiteral>,
  compileOptions: CompileOptions
): CompiledMatcher {
  const pattern: StringLiteral = path.value
  const placeholderMatcher = compileStringPlaceholderMatcher(
    path,
    compileOptions
  )

  if (placeholderMatcher) return placeholderMatcher

  pattern.value = unescapeIdentifier(pattern.value)

  return createStringLiteralMatcher(path, pattern.value, compileOptions)
}

export function createStringLiteralMatcher(
  path: NodePath,
  value: string,
  compileOptions: CompileOptions
): CompiledMatcher {
  const n = compileOptions.backend.t.namedTypes
  return convertPredicateMatcher(
    path,
    {
      match: (path: NodePath): boolean => {
        const { value: node } = path

        return (
          (n.StringLiteral.check(node) && value === node.value) ||
          (n.TemplateLiteral.check(node) &&
            node.quasis.length === 1 &&
            value === (node.quasis[0].value.cooked ?? node.quasis[0].value.raw))
        )
      },
      nodeType: ['StringLiteral', 'TemplateLiteral'],
    },
    compileOptions
  )
}
