import { TSExpressionWithTypeArguments, NodePath } from '../types'
import { CompiledReplacement, CompileReplacementOptions } from '.'
import compileCaptureReplacement from './Capture'

export default function compileTSExpressionWithTypeArgumentsReplacement(
  path: NodePath<TSExpressionWithTypeArguments, TSExpressionWithTypeArguments>,
  compileOptions: CompileReplacementOptions
): CompiledReplacement | void {
  const n = compileOptions.backend.t.namedTypes
  const pattern = path.value
  if (n.Identifier.check(pattern.expression)) {
    if (pattern.typeParameters == null) {
      const captureReplacement = compileCaptureReplacement(
        path,
        pattern.expression.name,
        compileOptions
      )
      if (captureReplacement) return captureReplacement
    }
  }
}
