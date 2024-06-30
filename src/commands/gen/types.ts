import {Args, Command, Flags} from '@oclif/core'
import {readFileSync} from 'node:fs'
import path from 'node:path'

const examples = readFileSync(path.resolve(__dirname, 'types.ejs')).toString('utf8')

export default class GenTypes extends Command {
  static override args = {
    file: Args.string({description: 'file to read'}),
  }

  static override description = 'describe the command here'

  static override examples = [examples]

  static override flags = {
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
    // flag with a value (-n, --name=VALUE)
    name: Flags.string({char: 'n', description: 'name to print'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(GenTypes)

    const name = flags.name ?? 'world'
    this.log(`hello ${name} from /Users/olier/my-project/thrift-code-gen/src/commands/gen/types.ts`)
    if (args.file && flags.force) {
      this.log(`you input --force and --file: ${args.file}`)
    }
  }
}
