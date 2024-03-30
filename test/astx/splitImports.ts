import { TransformOptions } from '../../src'
import { astxTestcase } from '../astxTestcase'

export const input = `
import { mapValues, map } from 'lodash'
import { fromPairs } from 'lodash'
`

export function astx({ astx }: TransformOptions): void {
  astx.find`import { $$imports } from 'lodash'`.replace(
    ({ $$imports }, parse) =>
      $$imports.flatMap(
        (imp) => parse`import ${imp.code} from 'lodash/${imp.code}'`
      )
  )
}

export const expected = `
import mapValues from "lodash/mapValues";
import map from "lodash/map";
import fromPairs from "lodash/fromPairs";
`

astxTestcase({
  file: __filename,
  input,
  astx,
  expected,
})
