import ZodSchemaAst from '@/ast/zod-ast'
import {IdlPlugins} from '@/config/normalization'
import {ThriftDirsTree} from '@/lib/parser'
import assert from 'node:assert'
import path from 'node:path'
import {Project} from 'ts-morph'

import Compiler from '../lib/compiler'

class ZodPlugin extends IdlPlugins {
  protected project: Project | undefined

  apply(compiler: Compiler) {
    compiler.hooks.compile.tapPromise('ZodPlugin', async (compiler, thriftAstTree) => {
      try {
        // read thrift dirs
        const tsConfigOption = this.readTsConfigPath(compiler)
        this.project = new Project(tsConfigOption)

        // zod schema files gen
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

    const validatorOutputDir = pluginOutputDir || path.resolve(outputDir, 'zod-validator')

    return Object.keys(thriftAstTree).map((key) => {
      const [dirInfo, astInfo] = thriftAstTree[key as `${string}.thrift`]
      const tsFilename = dirInfo.name.replace('.thrift', '.ts') as `${string}.ts`
      const {nameConventional, sourceDir, validatorOptions} = compiler.options

      assert(this.project)
      assert(validatorOptions)
      assert(nameConventional)

      const gen = new ZodSchemaAst(
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
      gen.beforeSave()

      assert(gen.sourceFile)

      return gen.sourceFile.save()
    })
  }
}

export default ZodPlugin
