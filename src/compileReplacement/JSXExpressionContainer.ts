import { JSXExpressionContainer, NodePath } from '../types'
import { CompiledReplacement, CompileReplacementOptions } from '.'
import compileCaptureReplacement from './Capture'

export default function compileJSXExpressionContainerReplacement(
  path: NodePath<JSXExpressionContainer, JSXExpressionContainer>,
  compileOptions: CompileReplacementOptions
): CompiledReplacement | void {
  const n = compileOptions.backend.t.namedTypes
  const pattern = path.value
  if (n.Identifier.check(pattern.expression)) {
    const captureReplacement = compileCaptureReplacement(
      path,
      pattern.expression.name,
      compileOptions
    )
    if (captureReplacement) return captureReplacement
  }
}
