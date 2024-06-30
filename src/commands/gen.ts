import {BaseCommand} from '@/base-command'
import {Args, Flags} from '@oclif/core'

const defaultArgs = {
  mock: Args.string({description: 'generate fakerjs code ts code'}),
  types: Args.string({description: 'generate typescript types'}),
  validator: Args.string({description: 'generate validator schema'}),
}

const defaultFlags = {
  type: Flags.string({
    char: 't',
    default: 'joi',
    description: 'validator schema lib, eg: zod, class-validator, joi, default is joi',
  }),
}

export default class Gen extends BaseCommand<typeof Gen> {
  static override args = defaultArgs

  static override description = 'generate typescript types, fakerjs code, joi/zod/class-validator schema code'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  static override flags = defaultFlags

  public async run(): Promise<void> {
    this.debug('json config: ', this.jsonConfig)

    const {args, flags} = this

    this.debug('gen command: ', args, flags)
  }
}
