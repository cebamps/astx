import { Node, NodePath } from '../types'
import { Match } from '../find'
import __debug, { Debugger } from 'debug'
import compileGenericNodeReplacement from './GenericNodeReplacement'
import compileGenericArrayReplacement from './GenericArrayReplacement'
import ClassImplements from './ClassImplements'
import ClassProperty from './ClassProperty'
import ExpressionStatement from './ExpressionStatement'
import FunctionTypeParam from './FunctionTypeParam'
import GenericTypeAnnotation from './GenericTypeAnnotation'
import Identifier from './Identifier'
import ImportDeclaration from './ImportDeclaration'
import ImportDefaultSpecifier from './ImportDefaultSpecifier'
import ImportSpecifier from './ImportSpecifier'
import JSXAttribute from './JSXAttribute'
import JSXExpressionContainer from './JSXExpressionContainer'
import JSXIdentifier from './JSXIdentifier'
import Literal from './Literal'
import ObjectProperty from './ObjectProperty'
import ObjectTypeProperty from './ObjectTypeProperty'
import Property from './Property'
import SpreadElement from './SpreadElement'
import SpreadProperty from './SpreadProperty'
import StringLiteral from './StringLiteral'
import TemplateLiteral from './TemplateLiteral'
import TSExpressionWithTypeArguments from './TSExpressionWithTypeArguments'
import TSPropertySignature from './TSPropertySignature'
import TSTypeParameter from './TSTypeParameter'
import TSTypeReference from './TSTypeReference'
import TypeParameter from './TypeParameter'
import VariableDeclarator from './VariableDeclarator'
import { Backend } from '../Backend'

const _debug = __debug('astx:compileReplacement')

export interface CompiledReplacement {
  generate: (match: Match) => Node | Node[]
}

export type RootCompileReplacementOptions = {
  debug?: Debugger
  backend: Backend
}

export type CompileReplacementOptions = {
  debug: Debugger
  backend: Backend
}

const nodeCompilers: Record<
  string,
  (
    pattern: NodePath<any>,
    options: CompileReplacementOptions
  ) => CompiledReplacement | undefined | void
> = {
  ClassImplements,
  ClassProperty,
  ExpressionStatement,
  FunctionTypeParam,
  GenericTypeAnnotation,
  Identifier,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportSpecifier,
  JSXAttribute,
  JSXExpressionContainer,
  JSXIdentifier,
  Literal,
  ObjectProperty,
  ObjectTypeProperty,
  Property,
  SpreadElement,
  SpreadProperty,
  StringLiteral,
  TemplateLiteral,
  TSExpressionWithTypeArguments,
  TSPropertySignature,
  TSTypeParameter,
  TSTypeReference,
  TypeParameter,
  VariableDeclarator,
}

export default function compileReplacement(
  pattern: NodePath | NodePath[],
  rootCompileReplacementOptions: RootCompileReplacementOptions
): CompiledReplacement {
  const { debug = _debug } = rootCompileReplacementOptions
  const compileOptions = { ...rootCompileReplacementOptions, debug }
  if (Array.isArray(pattern)) {
    return compileGenericArrayReplacement(pattern as any, compileOptions) as any
  }
  if (nodeCompilers[pattern.node.type]) {
    const replacement = nodeCompilers[pattern.node.type](
      pattern,
      compileOptions
    )
    if (replacement) return replacement
  }
  return compileGenericNodeReplacement(pattern, compileOptions)
}