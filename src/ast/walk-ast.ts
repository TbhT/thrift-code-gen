import {DefaultSourceFileHeaderComment, toCamelCase} from '@/config'
import {NameConventional, NameType} from '@/config/normalization'
import {ThriftDocumentTree} from '@/lib/parser'
import {
  BooleanLiteral,
  ConstDefinition,
  ConstList,
  ConstMap,
  ConstValue,
  DoubleConstant,
  EnumDefinition,
  FieldDefinition,
  FunctionType,
  Identifier,
  IncludeDefinition,
  IntConstant,
  ListType,
  MapType,
  NamespaceDefinition,
  ServiceDefinition,
  SetType,
  StringLiteral,
  StructDefinition,
  SyntaxType,
  ThriftDocument,
  ThriftStatement,
  TypedefDefinition,
  UnionDefinition,
} from '@creditkarma/thrift-parser'
import assert from 'node:assert'
import {resolve} from 'node:path'
import {snakeCase as toSnakeCase} from 'snake-case'
import {Project, SourceFile} from 'ts-morph'

export type ListStringType = `${'(string)' | string}[]`

export type BoolStringType = 'boolean' | 'false' | 'true'

export type NumberStringType = 'number'

export type StringType = 'string'

export type BigintType = 'bigint'

export type VoidStringType = 'void'

export type GeneralStringType =
  | BoolStringType
  | ListStringType
  | NumberStringType
  | StringType
  | VoidStringType
  | string

export function makeStringKeywordType(): StringType {
  return 'string'
}

export function makeNumberKeywordType(): NumberStringType {
  return 'number'
}

export function makeBoolKeywordType(): BoolStringType {
  return 'boolean'
}

export function makeIdentifierType(i: Identifier) {
  return i.value
}

export function makeVoidType(): VoidStringType {
  return 'void'
}

export function makeBigintType(): BigintType {
  return 'bigint'
}

export function makeI64Type(type: 'bigint' | 'number' | 'string') {
  if (type === 'number') {
    return makeNumberKeywordType()
  }

  if (type === 'string') {
    return makeStringKeywordType()
  }

  return makeBigintType()
}

export type EmitReturnType = {
  constList: ConstDefinition[]
  enumList: EnumDefinition[]
  includeList: IncludeDefinition[]
  moduleList: NamespaceDefinition[]
  serviceList: ServiceDefinition[]
  structureList: (StructDefinition | UnionDefinition)[]
  typedefList: TypedefDefinition[]
}

abstract class WalkAst {
  readonly ast: ThriftDocumentTree

  readonly fullFilename: string

  protected nameConventional?: NameConventional

  readonly outputIdlDir: string

  readonly project: Project

  sourceFile?: SourceFile

  readonly sourceIdlDir: string

  thriftTypesMap = new Map<string, ThriftStatement>()

  protected constructor(
    project: Project,
    filename: `${string}.ts`,
    ast: ThriftDocumentTree,
    sourceIdlDir: string,
    outputIdlDir: string,
  ) {
    this.fullFilename = resolve(outputIdlDir, filename)
    this.project = project
    this.ast = ast
    this.sourceIdlDir = sourceIdlDir
    this.outputIdlDir = outputIdlDir
    this.sourceFile = project.createSourceFile(this.fullFilename, '', {
      overwrite: true,
    })
  }

  protected static normalizeNameConventional(n: NameType, originalName: string) {
    let name = ''

    switch (n) {
      case 'camelCase': {
        name = toCamelCase(originalName, {
          pascalCase: false,
          preserveConsecutiveUppercase: true,
        })
        break
      }

      case 'snake': {
        name = toSnakeCase(originalName)
        break
      }

      case 'pascalCase': {
        name = toCamelCase(originalName, {
          pascalCase: true,
          preserveConsecutiveUppercase: true,
        })
        break
      }
    }

    return name
  }

  beforeSave() {
    assert(this.sourceFile)
    this.sourceFile.insertStatements(0, DefaultSourceFileHeaderComment)
  }

  protected expectedKVType(key: string, value: string, line: number, column: number): never {
    throw new Error(`field type ${key} is not matched with initializer type ${value} in file:
      ${this.fullFilename}:${line}:${column}`)
  }

  protected makeGeneralFieldType(fn: FunctionType): GeneralStringType {
    switch (fn.type) {
      case SyntaxType.DoubleKeyword:
      case SyntaxType.I8Keyword:
      case SyntaxType.I16Keyword:
      case SyntaxType.I32Keyword:
      case SyntaxType.ByteKeyword: {
        return makeNumberKeywordType()
      }

      case SyntaxType.I64Keyword: {
        return this.makeI64Type()
      }

      case SyntaxType.StringKeyword: {
        return makeStringKeywordType()
      }

      case SyntaxType.SetType:
      case SyntaxType.ListType: {
        return this.makeListType(fn)
      }

      case SyntaxType.MapType: {
        return this.makeRecordType(fn)
      }

      case SyntaxType.BoolKeyword: {
        return makeBoolKeywordType()
      }

      case SyntaxType.Identifier: {
        return makeIdentifierType(fn)
      }

      case SyntaxType.VoidKeyword: {
        return makeVoidType()
      }

      default: {
        throw new Error(`Unsupported type ${fn.type} at file
             ${this.fullFilename}:${fn.loc.start.line}:${fn.loc.start.column}`)
      }
    }
  }

  protected makeListType(list: ListType | SetType) {
    const valueType = this.makeGeneralFieldType(list.valueType)

    if (valueType.includes('[]')) {
      return `(${valueType})[]`
    }

    return `${valueType}[]`
  }

  protected makeRecordType(map: MapType): `Record<${string},${string}>` {
    switch (map.keyType.type) {
      case SyntaxType.MapType:
      case SyntaxType.ListType:
      case SyntaxType.SetType:
      case SyntaxType.ByteKeyword:
      case SyntaxType.BinaryKeyword: {
        throw new Error(`map key type do not support type ${map.keyType.type} at file
          ${this.fullFilename}:${map.keyType.loc.start.line}:${map.keyType.loc.start.column}
          `)
      }

      case SyntaxType.Identifier: {
        if (/(.+)\.(.+)/.test(map.keyType.value)) {
          throw new Error(`map key type do not support non-basic type key ${map.keyType.type} at file
          ${this.fullFilename}:${map.keyType.loc.start.line}:${map.keyType.loc.start.column}
            `)
        }
      }
    }

    const keyType = this.makeGeneralFieldType(map.keyType)
    const valueType = this.makeGeneralFieldType(map.valueType)

    return `Record<${keyType}, ${valueType}>`
  }

  protected normalOrderEmit({
    constList,
    enumList,
    includeList,
    moduleList,
    serviceList,
    structureList,
    typedefList,
  }: EmitReturnType) {
    for (const def of moduleList) this.emitModule(def)

    for (const def of includeList) this.emitInclude(def)

    for (const def of enumList) this.emitEnum(def)

    for (const def of constList) this.emitConst(def)

    for (const def of structureList) this.emitStruct(def)

    for (const def of typedefList) this.emitTypedef(def)

    for (const def of serviceList) this.emitService(def)
  }

  protected stringifyConst(def: ConstDefinition) {
    let name = ''
    let initializer = ''

    switch (def.fieldType.type) {
      case SyntaxType.MapType: {
        if (def.initializer.type !== SyntaxType.ConstMap) {
          this.expectedKVType(def.fieldType.type, def.initializer.type, def.loc.start.line, def.loc.start.column)
        }

        const s = this.stringifyConstMapStatement(def)
        name = s.name
        initializer = s.initializer
        break
      }

      case SyntaxType.SetType:
      case SyntaxType.ListType: {
        if (def.initializer.type !== SyntaxType.ConstList) {
          this.expectedKVType(def.fieldType.type, def.initializer.type, def.loc.start.line, def.loc.start.column)
        }

        const s = this.stringifyConstListStatement(def)
        name = s.name
        initializer = s.initializer
        break
      }

      case SyntaxType.Identifier: {
        // maybe it needs to be type checked later
        const s = this.stringifyConstIdentifierStatement(def)
        name = s.name
        initializer = s.initializer
        break
      }

      case SyntaxType.BoolKeyword: {
        if (def.initializer.type !== SyntaxType.BooleanLiteral) {
          this.expectedKVType(def.fieldType.type, def.initializer.type, def.loc.start.line, def.loc.start.column)
        }

        const s = this.stringifyConstBoolStatement(def)
        name = s.name
        initializer = s.initializer
        break
      }

      case SyntaxType.DoubleKeyword:
      case SyntaxType.I8Keyword:
      case SyntaxType.I16Keyword:
      case SyntaxType.I32Keyword:
      case SyntaxType.I64Keyword: {
        if (def.initializer.type !== SyntaxType.DoubleConstant && def.initializer.type !== SyntaxType.IntConstant) {
          this.expectedKVType(def.fieldType.type, def.initializer.type, def.loc.start.line, def.loc.start.column)
        }

        const s = this.stringifyConstNumberStatement(def)
        name = s.name
        initializer = s.value
        break
      }

      case SyntaxType.StringKeyword: {
        if (def.initializer.type !== SyntaxType.StringLiteral) {
          this.expectedKVType(def.fieldType.type, def.initializer.type, def.loc.start.line, def.loc.start.column)
        }

        const s = this.stringifyConstStringStatement(def)
        name = s.name
        initializer = s.initializer
        break
      }

      case SyntaxType.BinaryKeyword:
      case SyntaxType.ByteKeyword: {
        throw new Error(`ByteKeyword not supported convert at file
        ${this.fullFilename}:${def.loc.start.line}:${def.loc.start.column}`)
      }

      default: {
        throw new Error(`Unsupported type ${def.type}.`)
      }
    }

    return {initializer, name}
  }

  protected stringifyConstBoolStatement(def: ConstDefinition) {
    const name = def.name.value
    const fieldType = this.makeGeneralFieldType(def.fieldType)
    const initializer = `${(def.initializer as BooleanLiteral).value}`

    return {
      fieldType,
      initializer,
      name,
    }
  }

  protected stringifyConstIdentifierStatement(def: ConstDefinition) {
    const name = def.name.value
    const fieldType = this.makeGeneralFieldType(def.fieldType)
    let initializer = ''

    if ('value' in def.initializer) {
      // The initialized value string，boolean，identifier
      if (typeof def.initializer.value === 'string') {
        initializer = def.initializer.value.toString()
      }
      // The initialized value is IntConstant，DoubleConstant
      else if (typeof def.initializer.value === 'object') {
        initializer = def.initializer.value.value.toString()
      }
    }
    // The initialized value is ConstMap
    else if ('properties' in def.initializer) {
      initializer = this.stringifyConstMapValue(def.initializer)
    }
    // The initialized value is ConstList
    else if ('elements' in def.initializer) {
      initializer = this.stringifyConstList(def.initializer)
    }

    return {
      fieldType,
      initializer,
      name,
    }
  }

  protected stringifyConstList(list: ConstList): `[${string}]` {
    const elements = list.elements
      // eslint-disable-next-line array-callback-return
      .map((e) => {
        switch (e.type) {
          case SyntaxType.ConstList: {
            return this.stringifyConstList(e)
          }

          case SyntaxType.ConstMap: {
            return this.stringifyConstMapValue(e)
          }

          case SyntaxType.IntConstant:
          case SyntaxType.DoubleConstant: {
            return `${e.value.value}`
          }

          case SyntaxType.Identifier:
          case SyntaxType.BooleanLiteral:
          case SyntaxType.StringLiteral: {
            return `'${e.value}'`
          }
        }
      })
      .join(',')

    return `[${elements}]`
  }

  protected stringifyConstListStatement(def: ConstDefinition) {
    const name = def.name.value

    const fieldType = this.makeGeneralFieldType(def.fieldType)
    const initializer = this.stringifyConstList(def.initializer as ConstList)

    return {
      fieldType,
      initializer,
      name,
    }
  }

  protected stringifyConstMapStatement(def: ConstDefinition) {
    const name = def.name.value
    const fieldType = this.makeGeneralFieldType(def.fieldType)

    const initializer = this.stringifyConstMapValue(def.initializer as ConstMap)

    return {
      fieldType,
      initializer,
      name,
    }
  }

  protected stringifyConstMapValue(initializer: ConstMap): `{${string}}` {
    const propertiesValue = initializer.properties
      .map((property) => {
        const keyType = property.name.type
        const keyValue = this.stringifyConstValue(property.name)
        const value = this.stringifyConstValue(property.initializer)

        switch (keyType) {
          case SyntaxType.ConstMap:
          case SyntaxType.ConstList: {
            throw new Error(`map key type not support ${property.name.type} at file
           ${this.fullFilename}:${property.name.loc.start.line}:${property.name.loc.start.column}
           `)
          }

          case SyntaxType.Identifier: {
            if (/(.+)\.(.+)/.test(property.name.value)) {
              throw new Error(`map key type do not support type ${keyType}: ${property.name.value} at file
          ${this.fullFilename}:${property.name.loc.start.line}:${property.name.loc.start.column}
            `)
            }
          }
        }

        return `${keyValue}:${value}`
      })
      .join(',')

    return `{${propertiesValue}}`
  }

  protected stringifyConstNumberStatement(def: ConstDefinition) {
    const name = def.name.value
    const fieldType = this.makeGeneralFieldType(def.fieldType)
    const {value} = (def.initializer as DoubleConstant | IntConstant).value

    return {
      fieldType,
      name,
      value,
    }
  }

  protected stringifyConstStringStatement(def: ConstDefinition) {
    const name = def.name.value
    const fieldType = this.makeGeneralFieldType(def.fieldType)
    const initializer = (def.initializer as StringLiteral).value

    return {
      fieldType,
      initializer: `'${initializer}'`,
      name,
    }
  }

  protected stringifyConstValue(v: ConstValue): string {
    switch (v.type) {
      case SyntaxType.ConstMap: {
        return this.stringifyConstMapValue(v)
      }

      case SyntaxType.ConstList: {
        return this.stringifyConstList(v)
      }

      case SyntaxType.Identifier:
      case SyntaxType.StringLiteral:
      case SyntaxType.BooleanLiteral: {
        return `${v.value}`
      }

      case SyntaxType.IntConstant:
      case SyntaxType.DoubleConstant: {
        return `${v.value.value}`
      }

      default: {
        return ''
      }
    }
  }

  protected stringifyEnum(def: EnumDefinition) {
    const members = def.members.map((m) => {
      const value: {
        name: string
        value?: number
      } = {
        name: m.name.value,
      }

      if (m.initializer) {
        value.value = Number(m.initializer.value.value)
      }

      return value
    })

    const name = def.name.value

    return {
      members,
      name,
    }
  }

  protected stringifyFields(fields: FieldDefinition[]) {
    return fields.map((f) => {
      const requiredness = f.requiredness ?? ''

      const name = f.name.value

      return {
        annotations: f.annotations?.annotations,
        hasQuestionToken: f.requiredness === 'optional',
        name,
        requiredness,
        type: this.makeGeneralFieldType(f.fieldType),
      }
    })
  }

  protected stringifyStruct(def: StructDefinition | UnionDefinition) {
    const members = this.stringifyFields(def.fields)
    const name = def.name.value

    return {
      members,
      name,
    }
  }

  protected stringifyTypedef(def: TypedefDefinition) {
    const name = def.name.value
    const type = this.makeGeneralFieldType(def.definitionType)

    return {
      name,
      type,
    }
  }

  protected tryEmit(): ThriftDocument | never {
    const {ast, fullFilename} = this

    if (!ast) {
      throw new Error(`The thrift ast tree is empty in file ${fullFilename}`)
    }

    if (ast.type === SyntaxType.ThriftErrors) {
      throw new Error(
        `${ast.errors[0].type}: ${ast.errors[0].message} in file:${fullFilename.replace('.ts', '.thrift')}:${
          ast.errors[0].loc.start.line
        }:${ast.errors[0].loc.start.column}`,
      )
    }

    return ast
  }

  abstract emitConst(def: ConstDefinition): unknown

  abstract emitEnum(def: EnumDefinition): unknown

  abstract emitInclude(def: IncludeDefinition): unknown

  abstract emitModule(def: NamespaceDefinition): unknown

  abstract emitService(def: ServiceDefinition): unknown

  abstract emitStruct(def: StructDefinition | UnionDefinition): unknown

  /**
   * [9]  Typedef         ::=  'typedef' DefinitionType Identifier
   */
  abstract emitTypedef(def: TypedefDefinition): unknown

  abstract importThirdPartyModule(): unknown

  protected abstract makeI64Type(): string
}

export default WalkAst
