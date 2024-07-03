import {BaseCommand} from '@/base-command'
import {createCompiler, getNormalizedIdlOptions} from '@/lib'

export default class GenValidator extends BaseCommand<typeof GenValidator> {
  static override description = 'describe the command here'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  async createCompiler() {
    const options = getNormalizedIdlOptions(this.jsonConfig)

    if (options.tsPluginOptions) {
      options.tsPluginOptions.enable = false
    }

    if (options.mockOptions) {
      options.mockOptions.enable = false
    }

    this.compiler = createCompiler(options)
  }

  public async run(): Promise<void> {
    this.debug('json config: ', this.jsonConfig)

    const {compiler, flags} = this
    if (!flags.config) {
      this.error('--config is needed')
    }

    await compiler.run()

    this.log('thrift-cli gen:validator command completely')
  }
}
