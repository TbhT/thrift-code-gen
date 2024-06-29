import SchemaAst from '@/ast/schema-ast'
import {EmitReturnType, makeI64Type} from '@/ast/walk-ast'
import {listTypeReg, recordTypeReg} from '@/config'
import {NameConventional, ValidatorPluginOptions, defaultFormatConfig} from '@/config/normalization'
import {ThriftDirsTree, ThriftDocumentTree} from '@/lib/parser'
import {
  Annotation,
  EnumDefinition,
  ServiceDefinition,
  StructDefinition,
  SyntaxType,
  TypedefDefinition,
  UnionDefinition,
} from '@creditkarma/thrift-parser'
import assert from 'node:assert'
import {OptionalKind, Project, VariableStatementStructure} from 'ts-morph'

abstract class ValidatorSchemaAst<ValidatorReturnType> extends SchemaAst {
  protected nameConventional: NameConventional

  protected validatorOption: ValidatorPluginOptions

  protected variableStatements: OptionalKind<VariableStatementStructure>[] = []

  constructor(
    project: Project,
    filename: `${string}.ts`,
    ast: ThriftDocumentTree,
    sourceIdlDir: string,
    outputIdlDir: string,
    allIdlType: ThriftDirsTree,
    validatorOption: ValidatorPluginOptions,
    nameConventional: NameConventional,
  ) {
    super(project, filename, ast, sourceIdlDir, outputIdlDir, allIdlType)
    this.validatorOption = validatorOption
    this.nameConventional = nameConventional
  }

  // in validator situation, we just need run start from service part
  emit() {
    const emitReturnType = super.emit() as EmitReturnType
    // add all import
    this.validatorImport(emitReturnType)
    assert(this.sourceFile)
    // improve the performance
    this.sourceFile.addVariableStatements(this.variableStatements)
    this.sourceFile.formatText(defaultFormatConfig)

    this.importThirdPartyModule()
  }

  emitService(def: ServiceDefinition) {
    for (const fn of def.functions) {
      // Currently, we just extract first req params
      const reqParam = fn.fields[0]

      if (!reqParam) {
        continue
      }

      const reqParamType = reqParam.fieldType

      if (reqParamType.type !== SyntaxType.Identifier) {
        throw new Error(`Currently, req type in service must be struct type at in file ${this.fullFilename}`)
      }

      const thriftType = this.resolveIdentityThriftType(reqParamType.value)

      if (thriftType.type === SyntaxType.StructDefinition || thriftType.type === SyntaxType.UnionDefinition) {
        this.emitStruct(thriftType)
      } else {
        throw new Error(`Currently, req type in service must be struct type at in file ${this.fullFilename}`)
      }
    }
  }

  emitStruct(def: StructDefinition | UnionDefinition) {
    const {members, name} = this.stringifyStruct(def)
    const flag = this.thriftTypesPending.get(name)

    if (flag === undefined) {
      this.thriftTypesPending.set(name, 0)
    }

    // check if the struct has been added
    if (flag === 1) {
      return
    }

    const properties = members.map((m) => {
      let hasQuestionToken

      if (m.requiredness === 'required') {
        hasQuestionToken = false
      } else if (m.requiredness === 'optional') {
        hasQuestionToken = true
      } else {
        hasQuestionToken = true
      }

      const initializer = this.resolveGeneralType(m.type, hasQuestionToken, m.annotations)

      return {
        initializer,
        name: m.name,
      }
    })

    this.resolveStruct(name, properties)

    this.thriftTypesPending.set(name, 1)
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

  makeI64Type(): string {
    switch (this.validatorOption.i64As) {
      case 'bigint': {
        return makeI64Type('bigint')
      }

      case 'number': {
        return makeI64Type('number')
      }

      case 'string': {
        return makeI64Type('string')
      }
    }
  }

  protected resolveGeneralType(type: string, optional: boolean, annotations?: Annotation[]): ValidatorReturnType {
    let initializer: ValidatorReturnType

    switch (type) {
      case 'string': {
        initializer = this.resolveString(type, optional, annotations)
        break
      }

      case 'number': {
        initializer = this.resolveNumber(type, optional, annotations)
        break
      }

      case 'boolean': {
        initializer = this.resolveBool(type, optional, annotations)
        break
      }

      default: {
        if (listTypeReg.test(type)) {
          initializer = this.resolveListType(type, optional, annotations)
        } else if (recordTypeReg.test(type)) {
          initializer = this.resolveRecordType(type, optional, annotations)
        } else {
          initializer = this.resolveIdentityType(type, optional, annotations)
        }
      }
    }

    return initializer
  }

  resolveTypedefType(type: string, annotations?: Annotation[]) {
    const realType = this.thriftTypesMap.get(type) as TypedefDefinition
    const generalType = this.makeGeneralFieldType(realType.definitionType)

    const anno = annotations ?? realType.annotations?.annotations
    return this.resolveGeneralType(generalType, true, anno)
  }

  protected validatorImport({
    constList,
    enumList,
    includeList,
    moduleList,
    serviceList,
    structureList,
    typedefList,
  }: EmitReturnType) {
    const enableEntryAll = this.validatorOption.entry === '*'
    for (const def of moduleList) this.emitModule(def)

    for (const def of includeList) this.emitInclude(def)

    if (enableEntryAll) {
      for (const def of enumList) this.emitEnum(def)

      for (const def of constList) this.emitConst(def)

      for (const def of structureList) this.emitStruct(def)

      for (const def of typedefList) this.emitTypedef(def)
    }

    for (const def of serviceList) this.emitService(def)
  }

  abstract resolveBool(type: string, optional: boolean, annotations?: Annotation[]): ValidatorReturnType

  abstract resolveIdentityType(type: string, optional: boolean, annotations?: Annotation[]): ValidatorReturnType

  abstract resolveListType(type: string, optional: boolean, annotations?: Annotation[]): ValidatorReturnType

  abstract resolveNumber(type: string, optional: boolean, annotations?: Annotation[]): ValidatorReturnType

  abstract resolveRecordType(type: string, optional: boolean, annotations?: Annotation[]): ValidatorReturnType

  abstract resolveString(type: string, optional: boolean, annotations?: Annotation[]): ValidatorReturnType

  abstract resolveStruct(name: string, fields: {initializer: ValidatorReturnType; name: string}[]): unknown
}

export default ValidatorSchemaAst
