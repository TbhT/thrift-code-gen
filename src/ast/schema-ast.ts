import {ThriftDirsTree, ThriftDocumentTree} from '@/lib/parser'
import {
  ConstDefinition,
  EnumDefinition,
  IncludeDefinition,
  NamespaceDefinition,
  ServiceDefinition,
  StructDefinition,
  SyntaxType,
  ThriftStatement,
  TypedefDefinition,
  UnionDefinition,
} from '@creditkarma/thrift-parser'
import assert from 'node:assert'
import path from 'node:path'
import {Project} from 'ts-morph'

import WalkAst from './walk-ast'

class SchemaAst extends WalkAst {
  readonly allIdlType: ThriftDirsTree

  protected includedThriftModules: Record<string, string | undefined> = {}

  protected thriftTypesPending = new Map<string, number>()

  constructor(
    project: Project,
    filename: `${string}.ts`,
    ast: ThriftDocumentTree,
    sourceIdlDir: string,
    outputIdlDir: string,
    allIdlType: ThriftDirsTree,
  ) {
    super(project, filename, ast, sourceIdlDir, outputIdlDir)
    this.allIdlType = allIdlType
  }

  emit(): unknown {
    const tree = this.tryEmit()

    const enumList: EnumDefinition[] = []
    const constList: ConstDefinition[] = []
    const structureList: (StructDefinition | UnionDefinition)[] = []
    const includeList: IncludeDefinition[] = []
    const moduleList: NamespaceDefinition[] = []
    const typedefList: TypedefDefinition[] = []
    const serviceList: ServiceDefinition[] = []

    for (const def of tree.body) {
      switch (def.type) {
        case SyntaxType.IncludeDefinition: {
          includeList.push(def)
          break
        }

        case SyntaxType.ConstDefinition: {
          this.thriftTypesMap.set(def.name.value, def)
          constList.push(def)
          break
        }

        case SyntaxType.EnumDefinition: {
          this.thriftTypesMap.set(def.name.value, def)
          enumList.push(def)
          break
        }

        case SyntaxType.UnionDefinition:
        case SyntaxType.StructDefinition: {
          this.thriftTypesMap.set(def.name.value, def)
          structureList.push(def)
          break
        }

        case SyntaxType.NamespaceDefinition: {
          this.thriftTypesMap.set(def.name.value, def)
          moduleList.push(def)
          break
        }

        case SyntaxType.TypedefDefinition: {
          this.thriftTypesMap.set(def.name.value, def)
          typedefList.push(def)
          break
        }

        case SyntaxType.ServiceDefinition: {
          this.thriftTypesMap.set(def.name.value, def)
          serviceList.push(def)
          break
        }

        default: {
          throw new Error(`Unsupported type ${def.type}.`)
        }
      }
    }

    return {
      constList,
      enumList,
      includeList,
      moduleList,
      serviceList,
      structureList,
      typedefList,
    }
  }

  emitConst(_def: ConstDefinition): unknown {
    throw new Error('Method not implemented.')
  }

  emitEnum(_def: EnumDefinition) {
    throw new Error('Method not implemented.')
  }

  emitInclude(def: IncludeDefinition) {
    const {fileName, modulePath, relativePath} = this.stringifyInclude(def)

    this.includedThriftModules[fileName] = modulePath

    assert(this.sourceFile)

    this.sourceFile.addImportDeclaration({
      moduleSpecifier: relativePath,
      namespaceImport: fileName,
      trailingTrivia(writer) {
        writer.blankLineIfLastNot()
      },
    })

    return {
      fileName,
      modulePath,
      relativePath,
    }
  }

  emitModule(_def: NamespaceDefinition) {
    // TODO maybe it's necessary to add namespace when in thrift party lib
  }

  emitService(_def: ServiceDefinition): unknown {
    throw new Error('Method not implemented.')
  }

  emitStruct(_def: StructDefinition | UnionDefinition): unknown {
    throw new Error('Method not implemented.')
  }

  emitTypedef(_def: TypedefDefinition): unknown {
    throw new Error('Method not implemented.')
  }

  protected getEnumValues(type: EnumDefinition) {
    const enumValues = type.members.map((v) => {
      if (!v.initializer) {
        return Number.NaN
      }

      return Number(v.initializer.value.value)
    })

    // eslint-disable-next-line unicorn/no-array-reduce
    return enumValues.reduce((pre, cur) => {
      if (Number.isNaN(cur)) {
        if (pre.length === 0) {
          return [0]
        }

        const last = pre.at(-1)!

        return [...pre, last + 1]
      }

      return [...pre, cur]
    }, [] as number[])
  }

  protected hasImport(moduleSpecifier: string) {
    assert(this.sourceFile !== undefined)
    return Boolean(this.sourceFile.getImportDeclaration(moduleSpecifier))
  }

  importThirdPartyModule(): unknown {
    throw new Error('Method not implemented.')
  }

  protected makeI64Type(): string {
    throw new Error('Method not implemented.')
  }

  protected resolveIdentityThriftType(type: string) {
    let thriftType: ThriftStatement | undefined

    if (type.includes('.')) {
      const [filename] = type.split('.')
      const otherModuleFullPath = this.includedThriftModules[filename]
      if (!otherModuleFullPath) {
        throw new Error(`The thrift file of type: ${type} is not imported, and imported first`)
      }

      const otherFilename = `${otherModuleFullPath}.thrift`

      thriftType = this.resolveThriftTypeFromOtherFile(otherFilename as `${string}.thrift`, type)
    } else {
      thriftType = this.thriftTypesMap.get(type)
    }

    if (!thriftType) {
      throw new Error(`Identity type is empty for ${type}`)
    }

    return thriftType
  }

  resolveThriftTypeFromOtherFile(filename: `${string}.thrift`, t: string): ThriftStatement | never | undefined {
    if (!t.includes('.')) {
      return
    }

    if (!this.allIdlType[filename]) {
      throw new Error(`The thrift file: ${filename} is not exit !`)
    }

    const thriftDocument = this.allIdlType[filename][1]

    if (!thriftDocument) {
      throw new Error('The thrift document type is empty !')
    } else if (thriftDocument.type === SyntaxType.ThriftErrors) {
      throw new Error(`parse file ${filename.replace('.ts', '.thrift')} error`)
    }

    // eslint-disable-next-line array-callback-return
    return thriftDocument.body.find((v) => {
      if (
        v.type !== SyntaxType.NamespaceDefinition &&
        v.type !== SyntaxType.IncludeDefinition &&
        v.type !== SyntaxType.CppIncludeDefinition &&
        v.name.value === t.split('.')[1]
      ) {
        return v
      }
    })
  }

  protected stringifyInclude(def: IncludeDefinition) {
    const thriftFilePath = def.path.value
    const pathRegAr = /^((?:\.{1,2}\/)+(\w+))\.thrift$/.exec(thriftFilePath)

    if (!pathRegAr) {
      throw new Error(`invalid thrift include path ${thriftFilePath} at file
        ${this.fullFilename}:${def.path.loc.start.line}:${def.path.loc.start.column}`)
    }

    const fileName = pathRegAr[2]
    const relativeModulePath = pathRegAr[1]
    const resolveFullPath = path.resolve(this.sourceIdlDir, relativeModulePath)

    if (this.hasImport(relativeModulePath)) {
      throw new Error(`${relativeModulePath}.thrift file has same name thrift file , included already at file
        ${this.fullFilename}:${def.path.loc.start.line}:${def.path.loc.start.column}`)
    }

    return {
      fileName,
      modulePath: resolveFullPath,
      relativePath: relativeModulePath,
    }
  }
}

export default SchemaAst
