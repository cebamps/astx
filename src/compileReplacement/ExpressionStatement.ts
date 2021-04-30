import t from 'ast-types'
import j, { ExpressionStatement, ASTNode, ASTPath } from 'jscodeshift'
import { CompiledReplacement, CompileReplacementOptions } from '.'
import compileCaptureReplacement, { unescapeIdentifier } from './Capture'

export function convertCaptureToStatement(
  capture: ASTNode
): ASTNode | ASTNode[] {
  switch (capture.type) {
    case 'ClassExpression':
      return { ...capture, type: 'ClassDeclaration' }
    case 'FunctionExpression':
      return { ...capture, type: 'FunctionDeclaration' } as ASTNode
  }
  if (t.namedTypes.Statement.check(capture)) return capture
  if (t.namedTypes.Expression.check(capture))
    return j.expressionStatement(capture)
  throw new Error(`converting ${capture.type} to Statement isn't supported`)
}

const captureOptions = {
  convertCapture: convertCaptureToStatement,
}

export default function compileExpressionStatementReplacement(
  path: ASTPath<ExpressionStatement>,
  compileOptions: CompileReplacementOptions
): CompiledReplacement | void {
  const pattern = path.node
  if (pattern.expression.type === 'Identifier') {
    const captureReplacement = compileCaptureReplacement(
      pattern,
      pattern.expression.name,
      compileOptions,
      captureOptions
    )
    if (captureReplacement) return captureReplacement
    pattern.expression.name = unescapeIdentifier(pattern.expression.name)
  }
}