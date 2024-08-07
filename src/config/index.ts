import cc, {Options} from 'camelcase'

import {IdlOptions} from './normalization'

export const applyLoggingDefaults = (_options: IdlOptions) => {
  // TODO:
}

export const applyIdlOptionsDefaults = (_options: IdlOptions) => {
  // TODO:
}

export const DefaultSourceFileHeaderComment = `
/**
* Do not edit this file, and the file is autogenerated by the IDL Command Line Tools 
*/


`

export const toCamelCase = (s: string, options: Options) => cc(s, options)

export const listTypeReg = /(?:\((.+)\)|(.+))\[]$/

export const recordTypeReg = /Record<([\sA-Z_a-z]+),\s*(.+)>$/
