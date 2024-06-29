import {makeMethodAnnotations} from '@/ast/methods-annotation'
import SchemaAst from '@/ast/schema-ast'
import {EmitReturnType, makeI64Type} from '@/ast/walk-ast'
import {NameConventional, TSPluginOptions, defaultFormatConfig} from '@/config/normalization'
import {ThriftDirsTree, ThriftDocumentTree} from '@/lib/parser'
import {
  ConstDefinition,
  EnumDefinition,
  ServiceDefinition,
  StructDefinition,
  SyntaxType,
  TypedefDefinition,
  UnionDefinition,
} from '@creditkarma/thrift-parser'
import assert from 'node:assert'
import {snakeCase as toSnakeCase} from 'snake-case'
import {
  EnumDeclarationStructure,
  InterfaceDeclarationStructure,
  MethodDeclarationStructure,
  OptionalKind,
  Project,
  PropertyDeclarationStructure,
  TypeAliasDeclarationStructure,
  VariableDeclarationKind,
  VariableStatementStructure,
} from 'ts-morph'

class TypesAst extends SchemaAst {
  protected currentRequirenessScope: '' | 'optIn' | 'reqOut' = ''

  protected enumDeclarations: OptionalKind<EnumDeclarationStructure>[] = []

  protected interfaces: OptionalKind<InterfaceDeclarationStructure>[] = []

  protected tsOption: TSPluginOptions

  protected typedefs: OptionalKind<TypeAliasDeclarationStructure>[] = []

  protected variableStatements: OptionalKind<VariableStatementStructure>[] = []

  constructor(
    project: Project,
    filename: `${string}.ts`,
    ast: ThriftDocumentTree,
    sourceIdlDir: string,
    outputIdlDir: string,
    allIdlType: ThriftDirsTree,
    tsOption: TSPluginOptions,
    nameConvention: NameConventional,
  ) {
    super(project, filename, ast, sourceIdlDir, outputIdlDir, allIdlType)
    this.tsOption = tsOption
    this.nameConventional = nameConvention
  }

  emit() {
    const emitReturn = super.emit() as EmitReturnType
    this.typesOrderEmit(emitReturn)

    assert(this.sourceFile)
    this.sourceFile.addVariableStatements(this.variableStatements)
    this.sourceFile.addEnums(this.enumDeclarations)
    this.sourceFile.addTypeAliases(this.typedefs)
    this.sourceFile.addInterfaces(this.interfaces)
    this.sourceFile.formatText(defaultFormatConfig)

    this.importThirdPartyModule()
  }

  emitConst(def: ConstDefinition) {
    const {initializer, name} = super.stringifyConst(def)
    const flag = this.thriftTypesPending.get(name)

    if (flag === 1) {
      return
    }

    if (flag === undefined) {
      this.thriftTypesPending.set(name, 0)
    }

    assert(this.sourceFile)

    this.variableStatements.push({
      declarationKind: VariableDeclarationKind.Const,
      declarations: [{initializer, name}],
      isExported: true,
      trailingTrivia: (writer) => writer.blankLineIfLastNot(),
    })

    this.thriftTypesPending.set(name, 1)
  }

  emitEnum(def: EnumDefinition) {
    const {members, name} = this.stringifyEnum(def)
    const flag = this.thriftTypesPending.get(name)

    if (flag === 1) {
      return
    }

    if (flag === undefined) {
      this.thriftTypesPending.set(name, 0)
    }

    this.enumDeclarations.push({
      isExported: true,
      members,
      name,
      trailingTrivia: (writer) => writer.blankLineIfLastNot(),
    })

    this.thriftTypesPending.set(name, 1)
  }

  emitService(def: ServiceDefinition) {
    assert(this.sourceFile)
    assert(this.nameConventional)

    let name = def.name.value

    if (this.nameConventional.service !== 'original') {
      name = TypesAst.normalizeNameConventional(this.nameConventional.service, name)
    }

    const clsDecl = this.sourceFile.addClass({
      extends(w) {
        if (def.extends) {
          w.write(def.extends.value)
        }
      },
      isExported: true,
      name,
      trailingTrivia(w) {
        w.blankLineIfLastNot()
      },
    })

    const {clsProperties, methods} = this.stringifyMethods(def)

    clsDecl.addProperties(clsProperties)

    clsDecl.addMethods(methods)
  }

  emitStruct(def: StructDefinition | UnionDefinition) {
    const {members, name} = this.stringifyStruct(def)
    const flag = this.thriftTypesPending.get(name)

    if (flag === 1) {
      return
    }

    if (flag === undefined) {
      this.thriftTypesPending.set(name, 0)
    }

    for (const m of members) {
      // @link https://thrift.apache.org/docs/idl#field-requiredness
      // NOTICE: for input fields, the default rules
      if (m.requiredness === 'required') {
        m.hasQuestionToken = false
      } else if (m.requiredness === 'optional') {
        m.hasQuestionToken = true
      } else if (this.currentRequirenessScope === 'optIn') {
        m.hasQuestionToken = this.tsOption.requiredness.optIn
      } else if (this.currentRequirenessScope === 'reqOut') {
        m.hasQuestionToken = !this.tsOption.requiredness.reqOut
      } else {
        m.hasQuestionToken = false
      }
    }

    assert(this.sourceFile)

    this.interfaces.push({
      isExported: true,
      name,
      properties: members,
      trailingTrivia(writer) {
        writer.blankLineIfLastNot()
      },
    })
    this.thriftTypesPending.set(name, 1)
  }

  emitTypedef(def: TypedefDefinition) {
    const {name, type} = this.stringifyTypedef(def)
    const flag = this.thriftTypesPending.get(name)

    if (flag === 1) {
      return
    }

    if (flag === undefined) {
      this.thriftTypesPending.set(name, 0)
    }

    this.typedefs.push({
      isExported: true,
      name,
      trailingTrivia(writer) {
        writer.blankLineIfLastNot()
      },
      type,
    })

    this.thriftTypesPending.set(name, 1)
  }

  importThirdPartyModule() {
    assert(this.sourceFile)
    this.sourceFile.addImportDeclarations([
      {
        defaultImport: 'axios',
        moduleSpecifier: 'axios',
      },
    ])
  }

  protected makeI64Type(): string {
    // to provent unexpected input option
    switch (this.tsOption.i64As) {
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

  stringifyMethods(def: ServiceDefinition) {
    const clsProperties: OptionalKind<PropertyDeclarationStructure>[] = []

    const methods = def.functions.map((fn) => {
      const annotationsMap = makeMethodAnnotations(def.name.value, fn.name.value, fn.annotations?.annotations)

      const parameters = this.stringifyFields(fn.fields).map((f) => {
        // @link https://thrift.apache.org/docs/idl#field-requiredness
        // NOTICE: for input fields, the default rules

        const realType = this.resolveIdentityThriftType(f.type)

        if (realType.type === SyntaxType.StructDefinition || realType.type === SyntaxType.UnionDefinition) {
          assert(this.nameConventional)

          if (!f.type.includes('.')) {
            this.currentRequirenessScope = 'optIn'
            this.emitStruct(realType)
          }
        }

        if (f.requiredness === 'required') {
          f.hasQuestionToken = false
        } else if (f.requiredness === 'optional') {
          f.hasQuestionToken = true
        } else {
          f.hasQuestionToken = this.tsOption.requiredness.optIn
        }

        return f
      })

      const returnType = this.makeGeneralFieldType(fn.returnType)

      let pathPropertyName = ''

      if (annotationsMap) {
        if (annotationsMap.path) {
          pathPropertyName = toSnakeCase(annotationsMap.path, {
            delimiter: '_',
          })
            .split('/')
            .map((v) => v.toUpperCase())
            .filter(Boolean)
            .join('_')

          clsProperties.push({
            initializer: `'${annotationsMap.path}'`,
            isStatic: true,
            name: pathPropertyName,
          })
        } else if (annotationsMap.method) {
          const pName = toSnakeCase(fn.name.value, {
            delimiter: '_',
          }).toUpperCase()

          const initializer = `'/${toSnakeCase(def.name.value, {
            delimiter: '_',
          })}/${toSnakeCase(fn.name.value, {
            delimiter: '-',
          })}'`

          clsProperties.push({
            initializer,
            isStatic: true,
            name: pName,
          })
        }
      }

      assert(this.nameConventional)

      let name = fn.name.value
      // do the name normalize
      if (this.nameConventional.method !== 'original') {
        name = TypesAst.normalizeNameConventional(this.nameConventional.method, fn.name.value)
      }

      return {
        hasQuestionToken: false,
        name,
        parameters,
        statements(writer) {
          if (annotationsMap) {
            if (annotationsMap.method === 'get') {
              const pName = parameters[0]?.name
              const p = pName ? `, { params: ${pName} }` : ''

              writer.writeLine(`return axios.get<${returnType}>(${def.name.value}.${pathPropertyName}${p})`)
            } else if (annotationsMap.method === 'post') {
              writer.writeLine(
                `return axios.post<${returnType}>(${def.name.value}.${pathPropertyName}, ${parameters[0].name})`,
              )
            }
          }
        },
      } as OptionalKind<MethodDeclarationStructure>
    })

    return {
      clsProperties,
      methods,
    }
  }

  protected typesOrderEmit({
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

    // from service start gen types
    for (const def of serviceList) this.emitService(def)

    for (const def of enumList) this.emitEnum(def)

    for (const def of constList) this.emitConst(def)

    for (const def of structureList) this.emitStruct(def)

    for (const def of typedefList) this.emitTypedef(def)
  }
}

export default TypesAst
