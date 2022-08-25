import { TSTypeReference, NodePath } from '../types'
import { CompiledReplacement, CompileReplacementOptions } from '.'
import compileCaptureReplacement from './Capture'

export default function compileTSTypeReferenceReplacement(
  path: NodePath<TSTypeReference>,
  compileOptions: CompileReplacementOptions
): CompiledReplacement | void {
  const pattern = path.node
  if (pattern.typeName.type === 'Identifier') {
    if (pattern.typeParameters == null) {
      const captureReplacement = compileCaptureReplacement(
        path,
        pattern.typeName.name,
        compileOptions
      )
      if (captureReplacement) return captureReplacement
    }
  }
}