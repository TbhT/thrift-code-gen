import MockSchemaAst from '@/ast/mock-ast'
import {IdlPlugins} from '@/config/normalization'
import {ThriftDirsTree} from '@/lib/parser'
import assert from 'node:assert'
import path from 'node:path'
import {Project} from 'ts-morph'

import Compiler from '../lib/compiler'

class MockPlugin extends IdlPlugins {
  protected project: Project | undefined

  apply(compiler: Compiler) {
    compiler.hooks.compile.tapPromise('MockPlugin', async (compiler, thriftAstTree) => {
      try {
        // read thrift dirs
        const tsConfigOption = this.readTsConfigPath(compiler)
        this.project = new Project(tsConfigOption)

        // mock files gen
        const allFilesPromise = this.emitEachThriftFile(compiler, thriftAstTree)
        await Promise.all(allFilesPromise)
      } catch (error: unknown) {
        compiler.hooks.failed.call(error)
      }
    })
  }

  protected emitEachThriftFile(compiler: Compiler, thriftAstTree: ThriftDirsTree) {
    const {mockOptions, outputDir} = compiler.options
    const pluginOutputDir = this.normalizePath(mockOptions?.outputDir)

    const mockOutputDir = pluginOutputDir || path.resolve(outputDir, 'mock')

    return Object.keys(thriftAstTree).map((key) => {
      const [dirInfo, astInfo] = thriftAstTree[key as `${string}.thrift`]
      const tsFilename = dirInfo.name.replace('.thrift', '.ts') as `${string}.ts`
      const {mockOptions, nameConventional, sourceDir} = compiler.options

      assert(this.project)
      assert(mockOptions)
      assert(nameConventional)

      const gen = new MockSchemaAst(
        this.project,
        tsFilename,
        astInfo,
        sourceDir,
        mockOutputDir,
        thriftAstTree,
        mockOptions,
        nameConventional,
      )

      gen.emit()
      gen.beforeSave()

      assert(gen.sourceFile)

      return gen.sourceFile.save()
    })
  }
}

export default MockPlugin
