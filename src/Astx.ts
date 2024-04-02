import {
  Expression,
  Statement,
  Node,
  NodePath,
  ImportDeclaration,
} from './types'
import { Backend } from './backend/Backend'
import find, { Match, convertWithCaptures, createMatch } from './find'
import replace from './replace'
import compileMatcher, { CompiledMatcher, MatchResult } from './compileMatcher'
import CodeFrameError from './util/CodeFrameError'
import ensureArray from './util/ensureArray'
import * as AstTypes from 'ast-types'
import {
  isPlaceholder,
  getPlaceholder,
  getArrayPlaceholder,
  getRestPlaceholder,
} from './compileMatcher/Placeholder'
import { SimpleReplacementInterface } from './util/SimpleReplacementCollector'
import forEachNode from './util/forEachNode'
import addImports from './util/addImports'
import findImports from './util/findImports'
import removeImports, { removeFoundImport } from './util/removeImports'
import createReplacementConverter from './convertReplacement'
import compileReplacement, { CompiledReplacement } from './compileReplacement'

export type TransformOptions = {
  /** The absolute path to the current file. */
  file: string
  /** The source code of the current file. */
  source: string
  astx: Astx
  /**
   * Marks the given matches to be displayed in the matches list of vscode-astx etc.
   */
  mark(...matches: (Match | Match[] | Astx | Astx[])[]): void
  expression(strings: TemplateStringsArray, ...quasis: any[]): Expression
  statement(strings: TemplateStringsArray, ...quasis: any[]): Statement
  statements(strings: TemplateStringsArray, ...quasis: any[]): Statement[]
  t: typeof AstTypes
  report: (msg: unknown) => void
}

export type TransformFunction = (
  options: TransformOptions
) =>
  | string
  | null
  | undefined
  | void
  | Promise<string | null | undefined | void>

export type Transform = {
  astx?: TransformFunction
  find?: string | Node | Node[]
  replace?: string | Node | Node[] | GetReplacement
  where?: FindOptions['where']
  onReport?: (options: { file: string; report: unknown }) => void
  finish?: () => any
}

export type TransformResult = {
  file: string
  source?: string
  transformed?: string
  reports?: unknown[]
  error?: Error
  matches?: readonly Match[]
  backend: Backend
}

export type ParsePattern = (
  strings: string | string[] | TemplateStringsArray,
  ...quasis: any[]
) => Node | Node[]

export type GetReplacement = (
  astx: Astx,
  parse: ParsePattern
) => string | Node | Node[]

export type FindPredicate = (wrapper: Astx) => boolean

function isNode(x: unknown): x is Node {
  return x instanceof Object && typeof (x as any).type === 'string'
}
function isNodeArray(x: unknown): x is Node[] {
  return Array.isArray(x) && !Array.isArray((x as any).raw)
}
function isPlaceholdersHash(
  item: unknown
): item is { [name: `$${string}` | `$$${string}` | `$$$${string}`]: Astx } {
  if (!(item instanceof Object)) return false
  for (const [key, value] of Object.entries(item)) {
    if (!isPlaceholder(key)) return false
    if (!(value instanceof Astx)) return false
  }
  return true
}

export type FindOptions = {
  where?: { [captureName: string]: (path: NodePath) => boolean }
}

export type AstxContext = {
  backend: Backend
  simpleReplacements?: SimpleReplacementInterface
}

class ExtendableProxy {
  constructor(handler: ProxyHandler<any>) {
    return new Proxy(this, handler)
  }
}

export default class Astx extends ExtendableProxy implements Iterable<Astx> {
  [name: `$${string}` | `$$${string}` | `$$$${string}`]: Astx
  private readonly _matches: Match[]
  private readonly _withCaptures: Match[]
  private readonly _placeholder: string | undefined
  private _lazyPaths: NodePath<Node, any>[] | undefined
  private _lazyNodes: Node[] | undefined
  private _lazyInitialMatch: MatchResult | undefined

  constructor(
    public readonly context: AstxContext,
    paths: NodePath<any>[] | Match[],
    {
      withCaptures = [],
      placeholder,
    }: { withCaptures?: Match[]; placeholder?: string } = {}
  ) {
    super({
      get: (target: Astx, prop: string, receiver: Astx): Astx => {
        if (typeof prop === 'symbol' || !prop.startsWith('$')) {
          const result = (target as any)[prop]
          return result === target ? receiver : result
        }
        const matches: Match[] = []
        for (const {
          arrayPathCaptures,
          pathCaptures,
          stringCaptures,
        } of target._matches) {
          const path = pathCaptures?.[prop]
          const stringValue = stringCaptures?.[prop]
          const arrayPaths = arrayPathCaptures?.[prop]
          if (path)
            matches.push(
              createMatch(path, {
                stringCaptures: stringValue
                  ? { [prop]: stringValue }
                  : undefined,
              })
            )
          if (arrayPaths) matches.push(createMatch(arrayPaths, {}))
        }
        return new Astx(target.context, matches, { placeholder: prop })
      },
    })
    this._placeholder = placeholder
    const { NodePath } = context.backend.t
    this._matches =
      paths[0] instanceof NodePath
        ? (paths as NodePath[]).map((path) => createMatch(path, {}))
        : (paths as Match[])
    this._withCaptures = withCaptures
  }

  get backend(): Backend {
    return this.context.backend
  }

  get placeholder(): string | undefined {
    return this._placeholder
  }

  get size(): number {
    return this._matches.length
  }

  get matches(): readonly Match[] {
    return this._matches
  }

  get matched(): Astx | null {
    return this._matches.length ? this : null
  }

  *[Symbol.iterator](): Iterator<Astx> {
    if (this._placeholder) {
      for (const path of this.paths) {
        yield new Astx(this.context, [path])
      }
    } else {
      for (const match of this._matches) {
        yield new Astx(this.context, [match])
      }
    }
  }

  get match(): Match {
    const [match] = this._matches
    if (!match) {
      throw new Error(`you can't call match() when there are no matches`)
    }
    return match
  }

  get node(): Node {
    return this.match.node
  }

  get path(): NodePath {
    return this.match.path
  }

  get code(): string {
    return this.backend.generate(this.node).code
  }

  get stringValue(): string {
    const result = this.match.stringCaptures?.[this._placeholder || '']
    if (!result) throw new Error(`not a string capture`)
    return result
  }

  get paths(): readonly NodePath[] {
    return (
      this._lazyPaths ||
      (this._lazyPaths = this.matches.map((m) => m.paths).flat())
    )
  }

  get nodes(): readonly Node[] {
    return (
      this._lazyNodes ||
      (this._lazyNodes = this.matches.map((m) => m.nodes).flat())
    )
  }

  filter(iteratee: (astx: Astx, index: number, parent: Astx) => boolean): Astx {
    const filtered = []
    let index = 0
    for (const astx of this) {
      if (iteratee(astx, index++, this)) {
        filtered.push(astx.match)
      }
    }
    return new Astx(this.context, filtered)
  }

  map<T>(iteratee: (astx: Astx, index: number, parent: Astx) => T): T[] {
    const result = []
    let index = 0
    for (const astx of this) {
      result.push(iteratee(astx, index++, this))
    }
    return result
  }

  flatMap<T>(
    iteratee: (astx: Astx, index: number, parent: Astx) => T | T[]
  ): T[] {
    const result: any[] = []
    let index = 0
    for (const astx of this) {
      result.push(iteratee(astx, index++, this))
    }
    return result.flat()
  }

  at(index: number): Astx {
    return new Astx(
      this.context,
      this._matches[index] ? [this._matches[index]] : []
    )
  }

  withCaptures(
    ...captures:
      | (
          | Match
          | Astx
          | { [name: `$${string}` | `$$${string}` | `$$$${string}`]: Astx }
        )[]
  ): Astx {
    const withCaptures: Match[] = [...this._withCaptures]
    for (const item of captures) {
      if (item instanceof Astx) {
        if (item._placeholder) {
          const placeholder = item._placeholder
          for (const { path, paths, stringCaptures } of item._matches) {
            withCaptures.push(
              createMatch(paths, {
                captures: getPlaceholder(placeholder)
                  ? { [placeholder]: path }
                  : undefined,
                arrayCaptures:
                  getArrayPlaceholder(placeholder) ||
                  getRestPlaceholder(placeholder)
                    ? { [placeholder]: paths }
                    : undefined,
                stringCaptures:
                  getPlaceholder(placeholder) && stringCaptures?.[placeholder]
                    ? { [placeholder]: stringCaptures[placeholder] }
                    : undefined,
              })
            )
          }
        } else {
          for (const match of item._withCaptures) withCaptures.push(match)
          for (const match of item._matches) withCaptures.push(match)
        }
      } else if (isPlaceholdersHash(item)) {
        for (const [placeholder, astx] of Object.entries(item)) {
          const { _placeholder } = astx
          for (const { path, paths, stringCaptures } of astx._matches) {
            withCaptures.push(
              createMatch(paths, {
                captures: getPlaceholder(placeholder)
                  ? { [placeholder]: path }
                  : undefined,
                arrayCaptures:
                  getArrayPlaceholder(placeholder) ||
                  getRestPlaceholder(placeholder)
                    ? { [placeholder]: paths }
                    : undefined,
                stringCaptures:
                  getPlaceholder(placeholder) &&
                  _placeholder &&
                  stringCaptures?.[_placeholder]
                    ? { [placeholder]: stringCaptures[_placeholder] }
                    : undefined,
              })
            )
          }
        }
      } else {
        withCaptures.push(item)
      }
    }

    return new Astx(this.context, this._matches, {
      withCaptures,
    })
  }

  private get initialMatch(): MatchResult {
    return (
      this._lazyInitialMatch ||
      (this._lazyInitialMatch = convertWithCaptures([
        ...this._matches,
        ...this._withCaptures,
      ]))
    )
  }

  private _execPattern<Return>(
    name: string,
    exec: (
      pattern: NodePath<Node, any> | readonly NodePath<Node, any>[]
    ) => Return,
    arg0:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | string[]
      | TemplateStringsArray,
    ...rest: any[]
  ): Return {
    const { backend } = this
    const { parsePattern } = backend
    const { NodePath } = backend.t
    try {
      let pattern: NodePath<Node, any> | readonly NodePath<Node, any>[]
      if (typeof arg0 === 'string') {
        pattern = parsePattern(arg0)
      } else if (
        Array.isArray(arg0)
          ? arg0[0] instanceof NodePath
          : arg0 instanceof NodePath
      ) {
        pattern = ensureArray(arg0 as NodePath | NodePath[])
      } else if (isNode(arg0) || isNodeArray(arg0)) {
        pattern = ensureArray(arg0).map((node) => new NodePath(node))
      } else {
        pattern = parsePattern(arg0 as any, ...rest)
      }
      return exec(pattern)
    } catch (error) {
      if (error instanceof Error) {
        CodeFrameError.rethrow(error, {
          filename: `${name} pattern`,
          source: typeof arg0 === 'string' ? arg0 : undefined,
        })
      }
      throw error
    }
  }

  private _execPatternOrPredicate<Return>(
    name: string,
    exec: (match: CompiledMatcher['match']) => Return,
    arg0:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | string[]
      | TemplateStringsArray
      | FindPredicate,
    ...rest: any[]
  ): Return {
    const { backend } = this
    if (arg0 instanceof Function) {
      const predicate = arg0
      const match = (path: NodePath): MatchResult => {
        const wrapper = new Astx(this.context, [path], {
          withCaptures: this._matches,
        })
        return predicate(wrapper) ? wrapper.initialMatch || {} : null
      }
      try {
        return exec(match)
      } catch (error) {
        if (error instanceof Error) {
          CodeFrameError.rethrow(error, {
            filename: `${name} pattern`,
          })
        }
        throw error
      }
    } else {
      return this._execPattern(
        name,
        (pattern: NodePath<Node, any> | readonly NodePath<Node, any>[]) => {
          pattern = ensureArray(pattern)
          if (pattern.length !== 1) {
            throw new Error(`must be a single node`)
          }
          const matcher = compileMatcher(pattern[0], {
            backend,
          })
          return exec(matcher.match)
        },
        arg0,
        ...rest
      )
    }
  }

  closest(strings: TemplateStringsArray, ...quasis: any[]): Astx
  closest(
    pattern:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | FindPredicate,
    options?: FindOptions
  ): Astx
  closest(
    arg0:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | TemplateStringsArray
      | FindPredicate,
    ...rest: any[]
  ): Astx {
    const { context } = this
    return this._execPatternOrPredicate(
      'closest',
      (matcher: CompiledMatcher['match']): Astx => {
        const matchedParents: Set<NodePath> = new Set()
        const matches: Match[] = []
        this.paths.forEach((path) => {
          for (let p = path.parentPath; p; p = p.parentPath) {
            if (matchedParents.has(p)) return
            const match = matcher(p, this.initialMatch)
            if (match) {
              matchedParents.add(p)
              matches.push(createMatch(p, match))
              return
            }
          }
        })
        return new Astx(context, matches)
      },
      arg0,
      ...rest
    )
  }

  destruct(strings: TemplateStringsArray, ...quasis: any[]): Astx
  destruct(
    pattern:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | FindPredicate,
    options?: FindOptions
  ): Astx
  destruct(
    arg0:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | TemplateStringsArray
      | FindPredicate,
    ...rest: any[]
  ): Astx {
    const { context } = this
    return this._execPatternOrPredicate(
      'destruct',
      (matcher: CompiledMatcher['match']): Astx => {
        const matches: Match[] = []
        this.paths.forEach((path) => {
          const match = matcher(path, this.initialMatch)
          if (match) matches.push(createMatch(path, match))
        })
        return new Astx(context, matches)
      },
      arg0,
      ...rest
    )
  }

  find(strings: string[] | TemplateStringsArray, ...quasis: any[]): Astx
  find(
    pattern:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | FindPredicate,
    options?: FindOptions
  ): Astx
  find(
    arg0:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | string[]
      | TemplateStringsArray
      | FindPredicate,
    ...rest: any[]
  ): Astx {
    const { context, backend } = this
    if (arg0 instanceof Function) {
      const predicate = arg0
      const matches: Match[] = []
      forEachNode(backend.t, this.paths, ['Node'], (path: NodePath) => {
        const wrapper = new Astx(this.context, [path], {
          withCaptures: this._matches,
        })
        if (predicate(wrapper)) {
          matches.push(createMatch(path, wrapper.initialMatch || {}))
        }
      })
      return new Astx(context, matches)
    }
    return this._execPattern(
      'find',
      (
        pattern: NodePath<Node, any> | readonly NodePath<Node, any>[],
        options?: FindOptions
      ): Astx =>
        new Astx(
          context,
          find(this.paths, pattern, {
            ...options,
            backend,
            matchSoFar: this.initialMatch,
          })
        ),
      arg0,
      ...rest
    )
  }

  replace(strings: string[] | TemplateStringsArray, ...quasis: any[]): void
  replace(replacement: string | Node | Node[] | GetReplacement): void
  replace(
    arg0:
      | string
      | Node
      | Node[]
      | GetReplacement
      | string[]
      | TemplateStringsArray,
    ...quasis: any[]
  ): void {
    const { backend } = this
    const { parsePatternToNodes } = backend
    try {
      if (typeof arg0 === 'function') {
        // Always replace in reverse so that if there are matches inside of
        // matches, the inner matches get replaced first (since they come
        // later in the code)
        for (const astx of [...this].reverse()) {
          const replacement = arg0(astx, parsePatternToNodes)
          replace(
            astx.match,
            typeof replacement === 'string'
              ? parsePatternToNodes(replacement)
              : replacement,
            this.context
          )
        }
      } else if (typeof arg0 === 'string') {
        const replacement = parsePatternToNodes(arg0)
        for (let i = this._matches.length - 1; i >= 0; i--) {
          replace(this._matches[i], replacement, this.context)
        }
      } else if (isNode(arg0) || isNodeArray(arg0)) {
        for (let i = this._matches.length - 1; i >= 0; i--) {
          replace(this._matches[i], arg0, this.context)
        }
      } else {
        const finalPaths = parsePatternToNodes(arg0, ...quasis)
        this.replace(finalPaths)
      }
    } catch (error) {
      if (error instanceof Error) {
        CodeFrameError.rethrow(error, {
          filename: 'replace pattern',
          source: typeof arg0 === 'string' ? arg0 : undefined,
        })
      }
      throw error
    }
  }

  remove(): void {
    this.replace([])
  }

  addImports(strings: string[] | TemplateStringsArray, ...quasis: any[]): Astx
  addImports(
    pattern: string | Node | Node[] | NodePath<any> | NodePath<any>[]
  ): Astx
  addImports(
    arg0:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | string[]
      | TemplateStringsArray,
    ...rest: any[]
  ): Astx {
    return this._execPattern(
      'addImports',
      (pattern: NodePath<Node, any> | readonly NodePath<Node, any>[]): Astx =>
        addImports(this, Array.isArray(pattern) ? pattern : [pattern]),
      arg0,
      ...rest
    )
  }

  findImports(strings: string[] | TemplateStringsArray, ...quasis: any[]): Astx
  findImports(
    pattern: string | Node | Node[] | NodePath<any> | NodePath<any>[]
  ): Astx
  findImports(
    arg0:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | string[]
      | TemplateStringsArray,
    ...rest: any[]
  ): Astx {
    return this._execPattern(
      'findImports',
      (pattern: NodePath<Node, any> | readonly NodePath<Node, any>[]): Astx =>
        findImports(this, Array.isArray(pattern) ? pattern : [pattern]),
      arg0,
      ...rest
    )
  }

  removeImports(
    strings: string[] | TemplateStringsArray,
    ...quasis: any[]
  ): boolean
  removeImports(
    pattern: string | Node | Node[] | NodePath<any> | NodePath<any>[]
  ): boolean
  removeImports(
    arg0:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | string[]
      | TemplateStringsArray,
    ...rest: any[]
  ): boolean {
    return this._execPattern(
      'removeImports',
      (
        pattern: NodePath<Node, any> | readonly NodePath<Node, any>[]
      ): boolean =>
        removeImports(this, Array.isArray(pattern) ? pattern : [pattern]),
      arg0,
      ...rest
    )
  }

  replaceImport(
    strings: string[] | TemplateStringsArray,
    ...quasis: any[]
  ): ImportReplacer
  replaceImport(
    pattern: string | Node | Node[] | NodePath<any> | NodePath<any>[]
  ): ImportReplacer
  replaceImport(
    arg0:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | string[]
      | TemplateStringsArray,
    ...rest: any[]
  ): ImportReplacer {
    return this._execPattern(
      'replaceImport',
      (
        _pattern: NodePath<Node, any> | readonly NodePath<Node, any>[]
      ): ImportReplacer => {
        const pattern = Array.isArray(_pattern) ? _pattern : [_pattern]
        if (
          pattern.length !== 1 ||
          pattern[0].node.type !== 'ImportDeclaration'
        ) {
          throw new Error(`pattern must contain exactly one import declaration`)
        }
        const decl: ImportDeclaration = pattern[0]?.node as any
        if (decl.specifiers && decl.specifiers.length > 1) {
          throw new Error(
            `pattern may not contain more than one import specifier`
          )
        }
        const found = findImports(this, pattern)
        return new ImportReplacer(this, found, decl)
      },
      arg0,
      ...rest
    )
  }
}

class ImportReplacer {
  constructor(
    public astx: Astx,
    public found: Astx,
    public decl: ImportDeclaration
  ) {}

  with(strings: string[] | TemplateStringsArray, ...quasis: any[]): boolean
  with(
    pattern:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | GetReplacement
  ): boolean
  with(
    arg0:
      | string
      | Node
      | Node[]
      | NodePath<any>
      | NodePath<any>[]
      | GetReplacement
      | string[]
      | TemplateStringsArray,
    ...rest: any[]
  ): boolean {
    const { backend } = this.astx
    const { parsePatternToNodes } = backend

    const doReplace = (rawReplacement: any): boolean => {
      if (!this.found.matched) return false
      const match = this.found.match
      const path =
        match.path.parentPath?.node?.type === 'ExpressionStatement'
          ? match.path.parentPath
          : match.path
      const converter = createReplacementConverter(path)
      const generated = (
        rawReplacement instanceof Object &&
        typeof (rawReplacement as any).generate === 'function'
          ? (rawReplacement as CompiledReplacement)
          : compileReplacement(
              Array.isArray(rawReplacement)
                ? rawReplacement.map((n) => new backend.t.NodePath(n))
                : new backend.t.NodePath(rawReplacement),
              { backend }
            )
      ).generate(match)

      const converted = converter(
        Array.isArray(generated) ? generated[0] : generated
      )

      removeFoundImport(this.astx, this.decl as any, this.found)
      this.astx.addImports(converted)
      return true
    }

    try {
      if (typeof arg0 === 'function') {
        // Always replace in reverse so that if there are matches inside of
        // matches, the inner matches get replaced first (since they come
        // later in the code)
        return doReplace((arg0 as any)(this.found, parsePatternToNodes))
      } else if (typeof arg0 === 'string') {
        return doReplace(parsePatternToNodes(arg0))
      } else if (isNode(arg0) || isNodeArray(arg0)) {
        return doReplace(arg0)
      } else {
        const rawReplacement = parsePatternToNodes(arg0 as any, ...rest)
        return doReplace(rawReplacement)
      }
    } catch (error) {
      if (error instanceof Error) {
        CodeFrameError.rethrow(error, {
          filename: 'replace pattern',
          source: typeof arg0 === 'string' ? arg0 : undefined,
        })
      }
      throw error
    }
  }
}
