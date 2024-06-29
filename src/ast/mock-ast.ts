import {getFakerFromAnnotations, makeFaker} from '@/ast/faker-annotation'
import {EmitReturnType, makeI64Type} from '@/ast/walk-ast'
import {listTypeReg, recordTypeReg} from '@/config'
import {MockPluginOptions, NameConventional, defaultFormatConfig} from '@/config/normalization'
import {ThriftDirsTree, ThriftDocumentTree} from '@/lib/parser'
import {
  Annotation,
  ConstDefinition,
  EnumDefinition,
  ServiceDefinition,
  StructDefinition,
  SyntaxType,
  TypedefDefinition,
  UnionDefinition,
} from '@creditkarma/thrift-parser'
import toCamelCase from 'camelcase'
import assert from 'node:assert'
import {Project, VariableDeclarationKind} from 'ts-morph'

import SchemaAst from '../ast/schema-ast'

class MockSchemaAst extends SchemaAst {
  protected nameConventional: NameConventional

  private readonly mockOptions: MockPluginOptions

  constructor(
    project: Project,
    filename: `${string}.ts`,
    ast: ThriftDocumentTree,
    sourceIdlDir: string,
    outputIdlDir: string,
    allIdlType: ThriftDirsTree,
    mockOptions: MockPluginOptions,
    nameConventional: NameConventional,
  ) {
    super(project, filename, ast, sourceIdlDir, outputIdlDir, allIdlType)
    this.mockOptions = mockOptions
    this.nameConventional = nameConventional
  }

  emit() {
    const emitReturn = super.emit() as EmitReturnType
    this.importThirdPartyModule()
    this.normalOrderEmit(emitReturn)
    assert(this.sourceFile)
    this.sourceFile.formatText(defaultFormatConfig)
  }

  emitConst(def: ConstDefinition) {
    const {initializer, name} = this.stringifyConst(def)

    assert(this.sourceFile !== undefined)

    this.sourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          initializer,
          name,
        },
      ],
      isExported: true,
    })
  }

  emitEnum(_def: EnumDefinition) {
    // IMPORTANT: it's not necessary to implement the enum value in mock,
    // because the enum value will be parsed to number when the enum type
    // is used
  }

  emitService(_def: ServiceDefinition) {
    // this mock situation, the service mock is not needed
  }

  emitStruct(def: StructDefinition | UnionDefinition) {
    const {members, name} = this.stringifyStruct(def)
    const flag = this.thriftTypesPending.get(name)

    // init the flag
    if (flag === undefined) {
      this.thriftTypesPending.set(name, 0)
    }

    // check if the struct has been added
    if (flag === 1) {
      return
    }

    const properties = members
      // eslint-disable-next-line array-callback-return
      .map((m) => {
        const value = this.resolveGeneralType(m.type, m.annotations)
        if (value) {
          return {initializer: value, name: m.name}
        }
      })
      .filter(Boolean) as {initializer: string; name: string}[]

    assert(this.sourceFile !== undefined)

    this.sourceFile.addClass({
      isExported: true,
      name,
      properties,
    })

    this.thriftTypesPending.set(name, 1)
  }

  emitTypedef(_def: TypedefDefinition) {
    // it will be resolved in @method `resolveTypedefType` method, and
    // it is not necessary to deal with the def when parsed.
    // Maybe it will be better to be parsed when used
  }

  importThirdPartyModule() {
    assert(this.sourceFile)

    this.sourceFile.addImportDeclarations([
      {
        moduleSpecifier: '@faker-js/faker',
        namedImports: [
          {
            name: 'faker',
          },
        ],
      },
    ])
  }

  protected makeI64Type() {
    switch (this.mockOptions.i64As) {
      case 'bigint': {
        return makeI64Type('bigint')
      }

      case 'string': {
        return makeI64Type('string')
      }

      case 'number': {
        return makeI64Type('number')
      }
    }
  }

  protected resolveGeneralType(type: string, annotations?: Annotation[]) {
    let initializer = ''

    switch (type) {
      case 'string': {
        initializer = makeFaker(annotations, 'string', this.mockOptions)
        break
      }

      case 'number': {
        initializer = makeFaker(annotations, 'number', this.mockOptions)
        break
      }

      case 'boolean': {
        initializer = makeFaker(annotations, 'boolean', this.mockOptions)
        break
      }

      case 'bigint': {
        initializer = makeFaker(annotations, 'bigint', this.mockOptions)
        break
      }

      default: {
        if (listTypeReg.test(type)) {
          initializer = this.resolveListType(type, annotations)
        } else if (recordTypeReg.test(type)) {
          initializer = this.resolveRecordType(type, annotations)
        } else {
          initializer = this.resolveIdentityType(type, annotations)
        }
      }
    }

    if (initializer) {
      return initializer
    }

    return ''
  }

  protected resolveIdentityType(type: string, annotations?: Annotation[]) {
    const thriftType = super.resolveIdentityThriftType(type)

    const flag = this.thriftTypesPending.get(type)

    // the type is pending add, cycle dependency
    if (flag === 0) {
      // IMPORTANT: if cycle dependency, then the mock data will be undefined
      return 'undefined'
    }

    if (thriftType.type === SyntaxType.StructDefinition || thriftType.type === SyntaxType.UnionDefinition) {
      let finalTypeName = ''

      if (type.includes('.')) {
        finalTypeName = type
      } else {
        finalTypeName = toCamelCase(type, {
          pascalCase: true,
          preserveConsecutiveUppercase: true,
        })

        // if type in the same file, then add first
        this.emitStruct(thriftType)
      }

      return `new ${finalTypeName}()`
    }

    if (thriftType.type === SyntaxType.EnumDefinition) {
      const enumValuesParsed = this.getEnumValues(thriftType)

      if (enumValuesParsed?.length) {
        const index = Math.floor(Math.random() * enumValuesParsed.length)
        return `${enumValuesParsed[index]}`
      }

      return 'faker.datatype.number()'
    }

    if (thriftType.type === SyntaxType.TypedefDefinition) {
      return this.resolveTypedefType(thriftType.name.value, annotations)
    }

    return ''
  }

  protected resolveListType(type: string, annotations?: Annotation[]) {
    let regResult

    if ((regResult = listTypeReg.exec(type))) {
      const resultType = regResult[1] || regResult[2]
      let resultTypeValue = ''

      const fromThrift = getFakerFromAnnotations(annotations)
      resultTypeValue = fromThrift || this.resolveGeneralType(resultType, annotations)

      return `Array.from({ length: ${30} }).map(() => (${resultTypeValue}))`
    }

    return 'faker.datatype.array(30)'
  }

  protected resolveRecordType(type: string, annotations?: Annotation[]) {
    let regResult: RegExpExecArray | null
    const resultArray = []

    if ((regResult = recordTypeReg.exec(type))) {
      const key = regResult[1]
      const resultType = regResult[2]
      const keyValue = this.resolveGeneralType(key)
      const resultTypeValue = this.resolveGeneralType(resultType, annotations)

      resultArray.push([keyValue, resultTypeValue])
    }

    if (resultArray.length > 0) {
      return `{${resultArray.map(([key, value]) => `[${key}]:${value}`).join(',\n')}}`
    }

    return '{}'
  }

  protected resolveTypedefType(type: string, annotations?: Annotation[]) {
    const thriftType = this.thriftTypesMap.get(type) as TypedefDefinition
    const generalType = this.makeGeneralFieldType(thriftType.definitionType)

    const anno = annotations ?? thriftType.annotations?.annotations
    return this.resolveGeneralType(generalType, anno)
  }
}

export default MockSchemaAst
