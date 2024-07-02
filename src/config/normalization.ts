import {readFileSync} from 'node:fs'
import path from 'node:path'
import {FormatCodeSettings, ProjectOptions, ScriptTarget} from 'ts-morph'

import type Compiler from '../lib/compiler'

export type NameType = 'camelCase' | 'original' | 'pascalCase' | 'snake'

export type NameConventionalType =
  | {
      // struct: 'original';
      method: 'original'
      // structField: 'original';
      service: 'original'
      // other: 'original';
    }
  | {
      // struct: 'pascalCase';
      method: 'camelCase'
      // structField: 'camelCase';
      service: 'pascalCase'
      // other: 'camelCase';
    }

export type NameConventional = NameConventionalType

export interface TSPluginOptions {
  enable: boolean
  i64As: 'bigint' | 'number' | 'string'
  outputDir?: string
  requiredness: {
    optIn: boolean
    reqOut: boolean
  }
}

export interface MockPluginOptions {
  enable: boolean
  i64As: 'bigint' | 'number' | 'string'
  outputDir?: string
}

export interface ValidatorPluginOptions {
  enable: boolean
  entry: '*' | 'service'
  i64As: 'bigint' | 'number' | 'string'
  outputDir?: string
  schemaType: 'all' | 'class-validator' | 'joi' | 'zod'
}

export const DefaultTsConfigOptions: ProjectOptions = {
  compilerOptions: {
    target: ScriptTarget.ESNext,
  },
}

export abstract class IdlPlugins {
  protected normalizePath(originalPath?: string) {
    let fullPath = ''

    if (!originalPath) {
      return ''
    }

    fullPath = path.isAbsolute(originalPath) ? originalPath : path.resolve(process.cwd(), originalPath)

    return fullPath
  }

  protected readTsConfigPath(compiler: Compiler) {
    const {tsConfigPath} = compiler.options
    let tsConfigOption = DefaultTsConfigOptions

    if (tsConfigPath) {
      const fullTsConfigPath = path.isAbsolute(tsConfigPath)
        ? tsConfigPath
        : path.resolve(path.resolve(process.cwd(), './tsconfig.json'))

      const configContent = readFileSync(fullTsConfigPath).toString('utf8')
      tsConfigOption = JSON.parse(configContent) as ProjectOptions
    }

    return tsConfigOption
  }

  abstract apply(compiler: Compiler): void
}

export interface IdlOptions {
  /**
   * The generated ts mock code Plugin options
   */
  mockOptions?: MockPluginOptions
  /**
   * thrift type name config
   */
  nameConventional?: NameConventional
  /**
   * The code files root dir for output code files
   */
  outputDir: string
  /**
   * plugins to be extended
   */
  plugins?: IdlPlugins[]

  /**
   * The thrift files root dir
   */
  sourceDir: string
  /**
   * tsconfig file path
   */
  tsConfigPath?: string
  /**
   * The generated TS code Plugin option
   */
  tsPluginOptions?: TSPluginOptions
  /**
   * The validator schema generated ts code Plugin options
   */
  validatorOptions?: ValidatorPluginOptions
}

export const defaultTsPluginOptions = Object.freeze<TSPluginOptions>({
  enable: true,
  i64As: 'number',
  requiredness: {
    optIn: true,
    reqOut: true,
  },
})

export const defaultMockOptions = Object.freeze<MockPluginOptions>({
  enable: true,
  i64As: 'number',
})

export const defaultValidatorOptions = Object.freeze<ValidatorPluginOptions>({
  enable: true,
  entry: 'service',
  i64As: 'number',
  schemaType: 'joi',
})

export const defaultNameConventional = Object.freeze<NameConventional>({
  method: 'original',
  service: 'original',
})

export const defaultOutputDir = 'idl-codes'

export const defaultOutputDirPath = `${process.cwd()}/${defaultOutputDir}`

const normalizedDirPath = (config: IdlOptions) => {
  let outputDirPath: string
  if (path.isAbsolute(config.outputDir)) {
    outputDirPath = config.outputDir
  } else if (config.outputDir) {
    outputDirPath = path.resolve(process.cwd(), config.outputDir)
  } else {
    outputDirPath = defaultOutputDirPath
  }

  const sourceDirPath = path.isAbsolute(config.sourceDir)
    ? config.sourceDir
    : path.resolve(process.cwd(), config.sourceDir)

  return {
    outputDirPath,
    sourceDirPath,
  }
}

export const getNormalizedIdlOptions = (config: IdlOptions): IdlOptions => {
  // normalize the source and output dir path
  const {outputDirPath, sourceDirPath} = normalizedDirPath(config)

  return {
    mockOptions: {
      ...defaultMockOptions,
      ...config.mockOptions,
    },
    nameConventional: {
      ...defaultNameConventional,
      ...config.nameConventional,
    },
    outputDir: outputDirPath,
    plugins: config.plugins ?? [],
    sourceDir: sourceDirPath,
    tsPluginOptions: {
      ...defaultTsPluginOptions,
      ...config.tsPluginOptions,
    },
    validatorOptions: {
      ...defaultValidatorOptions,
      ...config.validatorOptions,
    },
  }
}

export const defaultFormatConfig = Object.freeze<FormatCodeSettings>({
  tabSize: 2,
})
