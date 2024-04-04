import { Comment, Node } from '../types'

type Commentable = {
  comments?: (Comment & { leading?: boolean; trailing?: boolean })[]
  leadingComments?: Comment[]
  trailingComments?: Comment[]
}

export default function transferComments(
  _from: Node | undefined,
  _to: Node | Node[] | undefined,
  options: { leading?: boolean; trailing?: boolean; clone?: boolean } = {
    leading: true,
    trailing: true,
    clone: true,
  }
) {
  if (!_from || !_to) return
  const from: Commentable = _from as any
  const leading = options.leading
    ? from.comments?.filter((c: any) => c.leading) || from.leadingComments
    : undefined
  if (leading?.length) {
    const to: Commentable = (Array.isArray(_to) ? _to[0] : _to) as any
    const dest = from.comments
      ? to.comments || (to.comments = [])
      : to.leadingComments || (to.leadingComments = [])
    for (const c of leading) dest.push(options.clone ? cloneComment(c) : c)
  }
  const trailing = options.trailing
    ? from.comments?.filter((c: any) => c.trailing) || from.trailingComments
    : undefined
  if (trailing?.length) {
    const to: Commentable = (
      Array.isArray(_to) ? _to[_to.length - 1] : _to
    ) as any
    const dest = from.comments
      ? to.comments || (to.comments = [])
      : to.trailingComments || (to.trailingComments = [])
    for (const c of trailing) dest.push(options.clone ? cloneComment(c) : c)
  }
}

function cloneComment(c: Comment): Comment {
  const { type, value } = c
  return { type, value }
}
