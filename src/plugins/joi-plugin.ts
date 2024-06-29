import JoiSchemaAst from '@/ast/joi-ast'
import {IdlPlugins} from '@/config/normalization'
import Compiler from '@/lib/compiler'
import {ThriftDirsTree} from '@/lib/parser'
import assert from 'node:assert'
import path from 'node:path'
import {Project} from 'ts-morph'

class JoiPlugin extends IdlPlugins {
  protected project: Project | undefined

  apply(compiler: Compiler) {
    compiler.hooks.compile.tapPromise('JoiPlugin', async (compiler, thriftAstTree) => {
      try {
        // read thrift dirs
        const tsConfigOption = this.readTsConfigPath(compiler)
        this.project = new Project(tsConfigOption)

        // validator files gen
        const allFilesPromise = this.emitEachThriftFile(compiler, thriftAstTree)

        await Promise.all(allFilesPromise)
      } catch (error: unknown) {
        compiler.hooks.failed.call(error)
      }
    })
  }

  protected emitEachThriftFile(compiler: Compiler, thriftAstTree: ThriftDirsTree) {
    const {outputDir, validatorOptions} = compiler.options

    const pluginOutputDir = this.normalizePath(validatorOptions?.outputDir)

    const validatorOutputDir = pluginOutputDir || path.resolve(outputDir, 'joi-validator')

    return Object.keys(thriftAstTree).map((key) => {
      const [dirInfo, astInfo] = thriftAstTree[key as `${string}.thrift`]
      const tsFilename = dirInfo.name.replace('.thrift', '.ts') as `${string}.ts`
      const {nameConventional, sourceDir, validatorOptions} = compiler.options

      assert(this.project)
      assert(validatorOptions)
      assert(nameConventional)

      const gen = new JoiSchemaAst(
        this.project,
        tsFilename,
        astInfo,
        sourceDir,
        validatorOutputDir,
        thriftAstTree,
        validatorOptions,
        nameConventional,
      )

      gen.emit()

      assert(gen.sourceFile)

      gen.beforeSave()
      return gen.sourceFile.save()
    })
  }
}

export default JoiPlugin
