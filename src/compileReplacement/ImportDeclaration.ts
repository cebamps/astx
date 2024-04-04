import { ImportDeclaration, NodePath, Node } from '../types'
import {
  CompiledReplacement,
  CompileReplacementOptions,
  ReplaceableMatch,
} from '.'
import compileGenericNodeReplacement from './GenericNodeReplacement'
import transferComments from '../util/transferComments'

export default function compileImportDeclarationReplacement(
  path: NodePath<ImportDeclaration, ImportDeclaration>,
  compileOptions: CompileReplacementOptions
): CompiledReplacement | void {
  const n = compileOptions.backend.t.namedTypes
  const replacement = compileGenericNodeReplacement(path, compileOptions)
  return {
    generate: (match: ReplaceableMatch): Node | Node[] => {
      const result: ImportDeclaration = replacement.generate(match) as any
      if (result.specifiers) {
        // move ImportDefaultSpecifier to beginning if necessary
        // because @babel/generator craps out otherwise
        const defaultIndex = result.specifiers.findIndex((s) =>
          n.ImportDefaultSpecifier.check(s)
        )
        if (defaultIndex > 0) {
          result.specifiers.unshift(
            ...(result.specifiers.splice(defaultIndex, 1) as any)
          )
        }
      }
      transferComments(path.node, result)
      return result
    },
  }
}
