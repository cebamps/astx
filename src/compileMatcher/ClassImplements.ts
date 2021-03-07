import { ClassImplements } from 'jscodeshift'
import { CompiledMatcher, CompileOptions } from '.'
import compileCaptureMatcher, { unescapeIdentifier } from './Capture'

export default function compileClassImplementsMatcher(
  query: ClassImplements,
  compileOptions: CompileOptions
): CompiledMatcher | void {
  if (query.id.type === 'Identifier') {
    if (query.typeParameters == null) {
      const captureMatcher = compileCaptureMatcher(
        query.id.name,
        compileOptions
      )
      if (captureMatcher) return captureMatcher
    }
    query.id.name = unescapeIdentifier(query.id.name)
  }
}
