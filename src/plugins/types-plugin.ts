import TypesAst from '@/ast/types-ast'
import {IdlPlugins} from '@/config/normalization'
import Compiler from '@/lib/compiler'
import {ThriftDirsTree} from '@/lib/parser'
import assert from 'node:assert'
import path from 'node:path'
import {Project} from 'ts-morph'

class TypesPlugin extends IdlPlugins {
  protected project: Project | undefined

  apply(compiler: Compiler) {
    compiler.hooks.compile.tapPromise('TypesPlugin', async (compiler, thriftAstTree) => {
      try {
        // read thrift dirs
        const tsConfigOption = this.readTsConfigPath(compiler)
        this.project = new Project(tsConfigOption)

        // ts files gen
        const allFilesPromise = this.emitEachThriftFile(compiler, thriftAstTree)

        await Promise.all(allFilesPromise)
      } catch (error: unknown) {
        compiler.hooks.failed.call(error)
      }
    })
  }

  protected emitEachThriftFile(compiler: Compiler, thriftAstTree: ThriftDirsTree) {
    const {outputDir, tsPluginOptions} = compiler.options

    const pluginOutputDir = this.normalizePath(tsPluginOptions?.outputDir)

    const tsOutputDir = pluginOutputDir || path.resolve(outputDir, 'ts-types')

    return Object.keys(thriftAstTree).map((key) => {
      const [dirInfo, astInfo] = thriftAstTree[key as `${string}.thrift`]

      const tsFilename = dirInfo.name.replace('.thrift', '.ts') as `${string}.ts`
      const {nameConventional, sourceDir, tsPluginOptions} = compiler.options

      assert(this.project)
      assert(tsPluginOptions)
      assert(nameConventional)

      const gen = new TypesAst(
        this.project,
        tsFilename,
        astInfo,
        sourceDir,
        tsOutputDir,
        thriftAstTree,
        tsPluginOptions,
        nameConventional,
      )

      gen.emit()
      gen.beforeSave()

      assert(gen.sourceFile)

      return gen.sourceFile.save()
    })
  }
}

export default TypesPlugin
