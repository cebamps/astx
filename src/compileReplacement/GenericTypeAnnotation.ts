import { GenericTypeAnnotation, ASTPath } from 'jscodeshift'
import { CompiledReplacement, CompileReplacementOptions } from '.'
import compileCaptureReplacement, { unescapeIdentifier } from './Capture'

export default function compileGenericTypeAnnotationReplacement(
  path: ASTPath<GenericTypeAnnotation>,
  compileReplacementOptions: CompileReplacementOptions
): CompiledReplacement | void {
  const pattern = path.node
  if (pattern.id.type === 'Identifier') {
    if (pattern.typeParameters == null) {
      const captureReplacement = compileCaptureReplacement(
        pattern,
        pattern.id.name,
        compileReplacementOptions
      )
      if (captureReplacement) return captureReplacement
    }
    pattern.id.name = unescapeIdentifier(pattern.id.name)
  }
}