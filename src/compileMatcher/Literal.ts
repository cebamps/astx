import { NodePath } from '../types'
import { Literal } from 'jscodeshift'
import { compileStringCaptureMatcher, unescapeIdentifier } from './Capture'
import {
  CompiledMatcher,
  CompileOptions,
  convertPredicateMatcher,
} from './index'
import sortFlags from './sortFlags'

export default function matchLiteral(
  path: NodePath<Literal>,
  compileOptions: CompileOptions
): CompiledMatcher {
  const pattern: Literal = path.node

  const { regex } = pattern

  if (regex) {
    const regexFlags = sortFlags(regex.flags)

    return convertPredicateMatcher(
      path,
      {
        match: (path: NodePath): boolean => {
          const { node } = path

          if (node?.type !== 'Literal') return false

          return (
            node.regex != null &&
            node.regex.pattern === regex.pattern &&
            sortFlags(node.regex.flags) === sortFlags(regexFlags)
          )
        },
        nodeType: 'Literal',
      },
      compileOptions
    )
  }

  if (typeof pattern.value === 'string') {
    const captureMatcher = compileStringCaptureMatcher(
      path,
      (node: Literal) => (typeof node.value === 'string' ? node.value : null),
      compileOptions
    )

    if (captureMatcher) return captureMatcher

    pattern.value = unescapeIdentifier(pattern.value)
  }

  return convertPredicateMatcher(
    path,
    {
      match: (path: NodePath): boolean => {
        const { node } = path

        if (node?.type !== 'Literal' || node.regex) return false

        return node.value === pattern.value
      },
      nodeType: 'Literal',
    },
    compileOptions
  )
}
