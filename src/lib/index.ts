import {applyIdlOptionsDefaults, applyLoggingDefaults} from '@/config'
import {IdlOptions, getNormalizedIdlOptions} from '@/config/normalization'

import Compiler from './compiler'
import IdlOptionsApply from './idl-option-apply'

export const createCompiler = (rawOptions: IdlOptions) => {
  const options = getNormalizedIdlOptions(rawOptions)
  const compiler = new Compiler(options)
  applyLoggingDefaults(options)

  // load plugins
  if (Array.isArray(options.plugins)) {
    for (const plugin of options.plugins) {
      plugin.apply(compiler)
    }
  }

  applyIdlOptionsDefaults(options)
  compiler.hooks.afterEnv.call()
  new IdlOptionsApply().process(options, compiler)
  compiler.hooks.initialize.call()

  return compiler
}

export {default as Compiler} from './compiler'
export {getNormalizedIdlOptions} from '@/config/normalization'
