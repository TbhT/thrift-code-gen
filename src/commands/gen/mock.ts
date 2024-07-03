import {BaseCommand} from '@/base-command'
import {createCompiler, getNormalizedIdlOptions} from '@/lib'

export default class GenMock extends BaseCommand<typeof GenMock> {
  static override description = 'only generate mock ts code'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  async createCompiler() {
    const options = getNormalizedIdlOptions(this.jsonConfig)

    if (options.tsPluginOptions) {
      options.tsPluginOptions.enable = false
    }

    if (options.validatorOptions) {
      options.validatorOptions.enable = false
    }

    this.compiler = createCompiler(options)
  }

  public async run(): Promise<void> {
    this.debug('json config: ', this.jsonConfig)

    const {compiler} = this
    await compiler.run()

    this.log('thrift-cli gen:mock command completely')
  }
}
