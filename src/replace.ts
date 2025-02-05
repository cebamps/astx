import { Node, NodePath } from './types'
import { Match } from './find'
import compileReplacement, { CompiledReplacement } from './compileReplacement'
import createReplacementConverter, { bulkConvert } from './convertReplacement'
import { Backend } from './backend/Backend'
import pipeline from './util/pipeline'
import lodash from 'lodash'
const { last } = lodash
import { SimpleReplacementInterface } from './util/SimpleReplacementCollector'
import transferComments from './util/transferComments'

export type ReplaceOptions = {
  backend: Backend
  simpleReplacements?: SimpleReplacementInterface
}

export default function replace(
  match: Match,
  replace: CompiledReplacement | Node | readonly Node[],
  { backend, simpleReplacements }: ReplaceOptions
): void {
  const path =
    match.path.parentPath?.node?.type === 'ExpressionStatement'
      ? match.path.parentPath
      : match.path
  const replacements = [
    ...bulkConvert(
      (replace instanceof Object &&
      typeof (replace as any).generate === 'function'
        ? (replace as CompiledReplacement)
        : compileReplacement(
            Array.isArray(replace)
              ? replace.map((n) => new backend.t.NodePath(n))
              : new backend.t.NodePath(replace),
            { backend }
          )
      ).generate(match),
      createReplacementConverter(path)
    ),
  ]

  if (match.paths.length === 1 && replacements.length === 1) {
    simpleReplacements?.replace(match.node, replacements[0])
  } else {
    simpleReplacements?.bail()
  }

  doReplace(match, replacements)
}

export function replaceAll(
  matches: Match[],
  replace:
    | CompiledReplacement
    | Node
    | readonly Node[]
    | ((match: Match) => CompiledReplacement | Node | readonly Node[]),
  { backend, simpleReplacements }: ReplaceOptions
): void {
  for (const match of matches) {
    const path =
      match.path.parentPath?.node.type === 'ExpressionStatement'
        ? match.path.parentPath
        : match.path
    const replacements = [
      ...bulkConvert(
        (replace instanceof Object &&
        typeof (replace as any).generate === 'function'
          ? (replace as CompiledReplacement)
          : compileReplacement(
              pipeline(
                typeof replace === 'function'
                  ? replace(match)
                  : (replace as any),
                (replacement: Node | readonly Node[]): NodePath | NodePath[] =>
                  Array.isArray(replacement)
                    ? replacement.map((n) => new backend.t.NodePath(n))
                    : new backend.t.NodePath(replacement)
              ),
              { backend }
            )
        ).generate(match),
        createReplacementConverter(path)
      ),
    ]

    if (match.paths.length === 1 && replacements.length === 1) {
      simpleReplacements?.replace(match.node, replacements[0])
    } else {
      simpleReplacements?.bail()
    }

    doReplace(match, replacements)
  }
}

function doReplace(match: Match, replacements: Node[]) {
  const replacedPaths = match.paths.map((p) =>
    p.parentPath?.node?.type === 'ExpressionStatement' ? p.parentPath : p
  )

  if (replacements.length) {
    transferComments(replacedPaths[0]?.node, replacements[0], { leading: true })
    transferComments(last(replacedPaths)?.node, last(replacements), {
      trailing: true,
    })
    replacedPaths[0]?.replace(...replacements)
  }

  for (let i = replacements.length ? 1 : 0; i < replacedPaths.length; i++) {
    replacedPaths[i].prune()
  }
}
