import {BaseCommand} from '@/base-command'
import {createCompiler, getNormalizedIdlOptions} from '@/lib'
import {readFileSync} from 'node:fs'
import path from 'node:path'

const examples = readFileSync(path.resolve(__dirname, 'types.ejs'))
  .toString('utf8')
  .split(/[\n\r]/)

export default class GenTypes extends BaseCommand<typeof GenTypes> {
  static override description = 'only generate typescript files'

  static override examples = [...examples]

  async createCompiler() {
    const options = getNormalizedIdlOptions(this.jsonConfig)

    if (options.mockOptions) {
      options.mockOptions.enable = false
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

    this.log('thrift-cli gen:types command completely')
  }
}
