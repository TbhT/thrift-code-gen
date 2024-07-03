import {Command, Flags, Interfaces} from '@oclif/core'
import {existsSync} from 'node:fs'
import path from 'node:path'

import {IdlOptions} from './config/normalization'
import {createCompiler} from './lib'
import Compiler from './lib/compiler'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & T['flags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class BaseCommand<T extends typeof Command> extends Command {
  // define flags that can be inherited by any command that extends BaseCommand
  static baseFlags = {
    config: Flags.string({
      char: 'c',
      description: 'idl config file from cwd, eg: ./idl.config.json',
      required: true,
    }),
    // 'log-level': Flags.option({
    //   default: 'info',
    //   helpGroup: 'GLOBAL',
    //   options: ['debug', 'warn', 'error', 'info', 'trace'] as const,
    //   summary: 'Specify level for logging.',
    // })(),
  }

  static configName = 'idl.config.json'

  protected args!: Args<T>
  protected compiler!: Compiler

  protected flags!: Flags<T>

  protected jsonConfig!: IdlOptions

  protected async catch(err: {exitCode?: number} & Error): Promise<unknown> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err)
  }

  protected createCompiler() {
    this.compiler = createCompiler(this.jsonConfig)
  }

  protected async finally(_: Error | undefined): Promise<unknown> {
    // called after run and catch regardless of whether or not the command errored
    return super.finally(_)
  }

  public async init() {
    await super.init()
    const {args, flags} = await this.parse({
      args: this.ctor.args,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    })

    this.debug('args,flags : ', args, flags)

    this.flags = flags as Flags<T>
    this.args = args as Args<T>

    if (flags.config) {
      let configPath = flags.config || path.resolve(process.cwd(), BaseCommand.configName)

      if (!path.isAbsolute(configPath)) {
        configPath = path.resolve(configPath)
      }

      if (!existsSync(configPath)) {
        this.log('parsed config path: ', configPath)
        this.error(new Error('The config path is not exist, please check the config path'), {exit: -1})
      }

      const config = await import(configPath)

      this.jsonConfig = config.default as IdlOptions

      this.createCompiler()
    }
  }
}
