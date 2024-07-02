import {BaseCommand} from '@/base-command'
import {Flags} from '@oclif/core'

const defaultFlags = {
  mock: Flags.string({
    char: 'm',
    default: 'fakerjs',
    description: 'mock lib, current only support fakerjs',
    helpValue: ['fakerjs', 'faker', 'fake'],
  }),
  validator: Flags.string({
    char: 'v',
    default: 'zod',
    description: 'validator lib, current only support: joi, zod, class-validator',
    helpValue: ['joi', 'Joi', 'zod', 'Zod', 'class-validator', 'cv'],
  }),
}

export default class Gen extends BaseCommand<typeof Gen> {
  static override description = 'generate typescript types, fakerjs code, joi/zod/class-validator schema code'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  static override flags = defaultFlags

  public async run(): Promise<void> {
    this.debug('json config: ', this.jsonConfig)

    const {flags} = this

    const {jsonConfig} = this

    if (jsonConfig.validatorOptions) {
      jsonConfig.validatorOptions.schemaType = flags.validator.toLowerCase() as
        | 'all'
        | 'class-validator'
        | 'joi'
        | 'zod'
    }

    this.debug('gen command: ', flags)
    const {compiler} = this
    await compiler.run()

    this.log('thrift-cli generate completely')
  }
}
