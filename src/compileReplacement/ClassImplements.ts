import { ClassImplements, NodePath } from '../types'
import { CompiledReplacement, CompileReplacementOptions } from '.'
import compileCaptureReplacement from './Capture'

export default function compileClassImplementsReplacement(
  path: NodePath<ClassImplements>,
  compileOptions: CompileReplacementOptions
): CompiledReplacement | void {
  const pattern = path.node
  if (pattern.id.type === 'Identifier') {
    if (pattern.typeParameters == null) {
      const captureReplacement = compileCaptureReplacement(
        path,
        pattern.id.name,
        compileOptions
      )
      if (captureReplacement) return captureReplacement
    }
  }
}