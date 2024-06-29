import {type IdlOptions} from '@/config/normalization'
import {ThriftDirsTree, parseThriftDirs, readThriftDirs} from '@/lib/parser'
import {DirectoryTree} from 'directory-tree'
import {AsyncParallelHook, AsyncSeriesHook, SyncHook} from 'tapable'

class Compiler {
  readonly hooks = Object.freeze({
    afterCompile: new AsyncSeriesHook<[Compiler]>(['compiler']),
    afterEnv: new SyncHook<[]>([]),
    beforeCompile: new AsyncSeriesHook<[Compiler, ThriftDirsTree]>(['compiler', 'thriftAstTree']),
    beforeRun: new AsyncSeriesHook<[Compiler, DirectoryTree[]]>(['compiler', 'thriftDirs']),
    compile: new AsyncParallelHook<[Compiler, ThriftDirsTree]>(['compiler', 'thriftAstTree']),
    done: new AsyncSeriesHook<[Compiler]>(['compiler']),
    failed: new SyncHook<[unknown]>(['error']),
    initialize: new SyncHook<[]>([]),
    run: new AsyncSeriesHook<[Compiler, DirectoryTree[]]>(['compiler', 'thriftDirs']),
  })

  readonly options: IdlOptions

  running = false

  constructor(options: IdlOptions) {
    this.options = options
  }

  close() {}

  async compile(thriftDirTree: DirectoryTree[], _callback: (error: Error) => void) {
    const thriftFileTree = await parseThriftDirs(thriftDirTree)
    await this.hooks.beforeCompile.promise(this, thriftFileTree)
    await this.hooks.compile.promise(this, thriftFileTree)
  }

  async run(_callback?: () => void) {
    try {
      // TODO: logger is needed
      // let logger = createConsoleLo`gger({})

      this.hooks.failed.tap('Compiler', (error) => {
        console.log(error)
      })

      this.running = true

      const finalCallback = (_error: Error) => {
        // TODO: final callback
      }

      const thriftDirTree = await readThriftDirs(this.options.sourceDir)

      if (thriftDirTree.length === 0) {
        // TODO: logger warning for empty directory
        return
      }

      await this.hooks.beforeRun.promise(this, thriftDirTree)

      await this.hooks.run.promise(this, thriftDirTree)

      await this.compile(thriftDirTree, finalCallback)
    } catch (error: unknown) {
      this.hooks.failed.call(error)
    }
  }

  watch() {}
}

export default Compiler
