import {IdlOptions} from '@/config/normalization'
import ClassValidatorPlugin from '@/plugins/class-validator-plugin'
import JoiPlugin from '@/plugins/joi-plugin'
import MockPlugin from '@/plugins/mock-plugin'
import TypesPlugin from '@/plugins/types-plugin'
import ZodPlugin from '@/plugins/zod-plugin'

import Compiler from './compiler'

class IdlOptionsApply {
  process(options: IdlOptions, compiler: Compiler) {
    // load ts-types plugin
    if (options.tsPluginOptions?.enable) {
      new TypesPlugin().apply(compiler)
    }

    // load mock plugin
    if (options.mockOptions?.enable) {
      new MockPlugin().apply(compiler)
    }

    if (options.validatorOptions?.enable) {
      switch (options.validatorOptions.schemaType) {
        case 'zod': {
          new ZodPlugin().apply(compiler)
          break
        }

        case 'joi': {
          new JoiPlugin().apply(compiler)
          break
        }

        case 'all': {
          new ZodPlugin().apply(compiler)
          new JoiPlugin().apply(compiler)
          new ClassValidatorPlugin().apply(compiler)
          break
        }

        case 'class-validator': {
          new ClassValidatorPlugin().apply(compiler)
          break
        }
      }
    }
  }
}

export default IdlOptionsApply
