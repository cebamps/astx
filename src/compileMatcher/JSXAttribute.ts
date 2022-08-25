import { JSXAttribute, NodePath } from '../types'
import { CompiledMatcher, CompileOptions } from '.'
import compileCaptureMatcher from './Capture'

export default function compileJSXAttributeMatcher(
  path: NodePath<JSXAttribute>,
  compileOptions: CompileOptions
): CompiledMatcher | void {
  const pattern: JSXAttribute = path.node

  if (pattern.name.type === 'JSXIdentifier') {
    if (pattern.value == null) {
      const captureMatcher = compileCaptureMatcher(
        path,
        pattern.name.name,
        compileOptions
      )

      if (captureMatcher) return captureMatcher
    }
  }
}
