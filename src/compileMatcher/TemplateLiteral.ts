import { TemplateLiteral, NodePath } from '../types'
import { CompileOptions, CompiledMatcher } from '.'
import {
  compileStringPlaceholderMatcher,
  unescapeIdentifier,
} from './Placeholder'
import { createStringLiteralMatcher } from './StringLiteral'

function generateValue(cooked: string): { raw: string; cooked: string } {
  return { raw: cooked.replace(/\\|`|\${/g, '\\$&'), cooked }
}

export default function matchTemplateLiteral(
  path: NodePath<TemplateLiteral, TemplateLiteral>,
  compileOptions: CompileOptions
): CompiledMatcher | void {
  const pattern: TemplateLiteral = path.value

  const placeholderMatcher = compileStringPlaceholderMatcher(
    path,
    compileOptions
  )

  if (placeholderMatcher) return placeholderMatcher

  if (pattern.quasis.length === 1) {
    const [quasi] = pattern.quasis
    if (quasi.value.cooked) {
      const unescaped = unescapeIdentifier(quasi.value.cooked)
      if (unescaped !== quasi.value.cooked) {
        quasi.value = generateValue(unescaped)
      }
    }
    return createStringLiteralMatcher(
      path,
      quasi.value.cooked ?? quasi.value.raw,
      compileOptions
    )
  }
}
