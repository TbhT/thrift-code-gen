import {parseJoiAnnotations, parseZodAnnotations} from '@/ast/annotations'
import ValidatorSchemaAst from '@/ast/validator-schema-ast'
import {listTypeReg, recordTypeReg, toCamelCase} from '@/config'
import {Annotation, EnumDefinition, SyntaxType, TypedefDefinition} from '@creditkarma/thrift-parser'
import assert from 'node:assert'
import {VariableDeclarationKind} from 'ts-morph'

class ZodSchemaAst extends ValidatorSchemaAst<string> {
  emitEnum(def: EnumDefinition) {
    const {members, name} = this.stringifyEnum(def)
    const flag = this.thriftTypesPending.get(name)

    if (flag === undefined) {
      this.thriftTypesPending.set(name, 0)
    }

    if (flag === 1) {
      return
    }

    assert(this.sourceFile)
    this.sourceFile.addEnum({
      isExported: true,
      members,
      name,
      trailingTrivia: (writer) => writer.blankLineIfLastNot(),
    })

    this.thriftTypesPending.set(name, 1)
  }

  emitTypedef(_def: TypedefDefinition) {
    // should skip
  }

  importThirdPartyModule() {
    assert(this.sourceFile)
    this.sourceFile.addImportDeclaration({
      moduleSpecifier: 'zod',
      namedImports: ['z'],
    })
  }

  resolveBool(_type: string, optional: boolean, _annotations?: Annotation[] | undefined): string {
    return `z.boolean()${optional ? '' : '.required()'}`
  }

  resolveEnum(def: EnumDefinition, optional: boolean) {
    return `z.nativeEnum(${def.name.value})${optional ? '.optional()' : ''}`
  }

  resolveIdentityType(type: string, optional: boolean, annotations: Annotation[] | undefined): string {
    const realType = super.resolveIdentityThriftType(type)

    const flag = this.thriftTypesPending.get(type)

    if (flag === 0) {
      // when recycle reference, use any replaced
      return 'z.any()'
    }

    if (realType.type === SyntaxType.StructDefinition || realType.type === SyntaxType.UnionDefinition) {
      // if type in the same file, then import the type first
      if (!type.includes('.')) {
        this.emitStruct(realType)
      }

      return toCamelCase(type, {
        pascalCase: true,
        preserveConsecutiveUppercase: true,
      })
    }

    if (realType.type === SyntaxType.EnumDefinition) {
      this.emitEnum(realType)
      return this.resolveEnum(realType, optional)
    }

    if (realType.type === SyntaxType.TypedefDefinition) {
      return this.resolveTypedefType(realType.name.value, annotations) as string
    }

    return 'z.any()'
  }

  resolveListType(type: string, optional: boolean, annotations: Annotation[] | undefined): string {
    let regResult: RegExpExecArray | null
    let result = ''

    if ((regResult = listTypeReg.exec(type))) {
      const resultType = regResult[1] || regResult[2]
      const generalResult = this.resolveGeneralType(resultType, optional, annotations)

      if (!generalResult) {
        throw new Error(`type: ${type} is empty !`)
      }

      result = `z.array(${generalResult})`
    } else {
      result = 'z.array(z.any())'
    }

    if (optional) {
      result = `${result}.optional()`
    }

    const anno = parseZodAnnotations(annotations)
    let stringify = ''
    if (anno.size > 0) {
      stringify = `.${[...anno].join('.')}`
    }

    return `${result}${stringify}`
  }

  resolveNumber(_type: string, optional: boolean, annotations: Annotation[] | undefined): string {
    const anno = parseZodAnnotations(annotations)

    if (optional) {
      anno.add('optional()')
    }

    let stringify = ''
    if (anno.size > 0) {
      stringify = `.${[...anno].join('.')}`
    }

    return `z.number()${stringify}`
  }

  resolveRecordType(type: string, optional: boolean, annotations: Annotation[] | undefined): string {
    let regResult: RegExpExecArray | null
    const resultArray: string[][] = []

    if ((regResult = recordTypeReg.exec(type))) {
      const key = regResult[1]
      const resultType = regResult[2]

      const resultTypeValue = this.resolveGeneralType(resultType, optional)!

      resultArray.push([key, resultTypeValue])
    }

    const anno = parseJoiAnnotations(annotations)
    if (optional) {
      anno.add('optional()')
    }

    let stringify = ''
    if (anno.size > 0) {
      stringify = `.${[...anno].join('.')}`
    }

    return `z.record(${resultArray[0][1]})${stringify}`
  }

  resolveString(_type: string, optional: boolean, annotations: Annotation[] | undefined): string {
    const anno = parseZodAnnotations(annotations)
    if (optional) {
      // all properties are required by default
      anno.add('optional()')
    }

    let stringify = ''
    if (anno.size > 0) {
      stringify = `.${[...anno].join('.')}`
    }

    return `z.string()${stringify}`
  }

  resolveStruct(name: string, fields: {initializer: string; name: string}[]) {
    const initializer = `z.object({\n${fields.map((p) => `${p.name}: ${p.initializer}`).join(',\n')}\n})`

    this.variableStatements.push({
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          initializer,
          name,
        },
      ],
      isExported: true,
      trailingTrivia(w) {
        w.blankLineIfLastNot()
      },
    })
  }
}

export default ZodSchemaAst
