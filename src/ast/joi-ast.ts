import {parseJoiAnnotations} from '@/ast/annotations'
import ValidatorSchemaAst from '@/ast/validator-schema-ast'
import {listTypeReg, recordTypeReg, toCamelCase} from '@/config'
import {Annotation, EnumDefinition, SyntaxType, TypedefDefinition} from '@creditkarma/thrift-parser'
import assert from 'node:assert'
import {VariableDeclarationKind} from 'ts-morph'

class JoiSchemaAst extends ValidatorSchemaAst<string> {
  emitEnum(_def: EnumDefinition) {
    // skip enum type
  }

  emitTypedef(_def: TypedefDefinition) {
    // skip
  }

  importThirdPartyModule() {
    assert(this.sourceFile)
    this.sourceFile.addImportDeclaration({
      defaultImport: 'Joi',
      moduleSpecifier: 'joi',
    })
  }

  resolveBool(_type: string, optional: boolean, _annotations?: Annotation[] | undefined): string {
    return `Joi.boolean()${optional ? '' : '.required()'}`
  }

  resolveIdentityType(type: string, optional: boolean, annotations?: Annotation[]): string {
    const realType = super.resolveIdentityThriftType(type)

    const flag = this.thriftTypesPending.get(type)

    if (flag === 0) {
      // when recycle reference, use any replaced
      return 'Joi.any()'
    }

    if (realType.type === SyntaxType.StructDefinition || realType.type === SyntaxType.UnionDefinition) {
      let finalName = ''

      if (type.includes('.')) {
        // if type located in other module,
        finalName = type
      } else {
        // if type located in the same file, type name should be pascal case
        finalName = toCamelCase(type, {
          pascalCase: true,
          preserveConsecutiveUppercase: true,
        })
        // if type in the same file, then import the type first
        this.emitStruct(realType)
      }

      return finalName
    }

    if (realType.type === SyntaxType.EnumDefinition) {
      // when type is enum, then parse all enum to number
      const parsedEnumValues = this.getEnumValues(realType)

      if (parsedEnumValues.length > 0) {
        return `Joi.number().valid(${parsedEnumValues.toString()})${optional ? '' : '.required()'}`
      }

      return `Joi.number()${optional ? '' : '.required()'}`
    }

    if (realType.type === SyntaxType.TypedefDefinition) {
      return this.resolveTypedefType(realType.name.value, annotations) as string
    }

    return 'Joi.any()'
  }

  resolveListType(type: string, optional: boolean, annotations?: Annotation[]): string {
    let regResult: RegExpExecArray | null
    let result = ''

    if ((regResult = listTypeReg.exec(type))) {
      const resultType = regResult[1] || regResult[2]
      const generalResult = this.resolveGeneralType(resultType, optional, annotations)

      if (!generalResult) {
        throw new Error(`type: ${type} is empty !`)
      }

      result = `Joi.array().items(${generalResult})`
    } else {
      result = 'Joi.array().items(Joi.any())'
    }

    const anno = parseJoiAnnotations(annotations)
    if (!optional) {
      anno.add('required()')
    }

    let stringify = ''
    if (anno.size > 0) {
      stringify = `.${[...anno].join('.')}`
    }

    return `${result}${stringify}`
  }

  resolveNumber(_type: string, optional: boolean, annotations?: Annotation[]): string {
    const anno = parseJoiAnnotations(annotations)
    if (!optional) {
      anno.add('required()')
    }

    let stringify = ''
    if (anno.size > 0) {
      stringify = `.${[...anno].join('.')}`
    }

    return `Joi.number()${stringify}`
  }

  resolveRecordType(type: string, optional: boolean, annotations?: Annotation[]): string {
    let regResult: RegExpExecArray | null
    const resultArray = []

    if ((regResult = recordTypeReg.exec(type))) {
      const key = regResult[1]
      const resultType = regResult[2]

      const resultTypeValue = this.resolveGeneralType(resultType, optional)!

      resultArray.push([key, resultTypeValue])
    }

    const anno = parseJoiAnnotations(annotations)
    if (!optional) {
      anno.add('required()')
    }

    let stringify = ''
    if (anno.size > 0) {
      stringify = `.${[...anno].join('.')}`
    }

    if (resultArray.length > 0) {
      // for map type, it should use pattern
      return `Joi.object({}).pattern(
      Joi.string(),
      ${resultArray[0][1]}${stringify}
      )`
    }

    return `Joi.object()${stringify}`
  }

  resolveString(_type: string, optional: boolean, annotations?: Annotation[]): string {
    const anno = parseJoiAnnotations(annotations)
    if (optional) {
      anno.add("allow('')")
    } else {
      anno.add('required()')
    }

    let stringify = ''

    if (anno.size > 0) {
      stringify = `.${[...anno].join('.')}`
    }

    return `Joi.string()${stringify}`
  }

  resolveStruct(name: string, fields: {initializer: string; name: string}[]) {
    const initializer = `Joi.object({\n${fields.map((p) => `${p.name}: ${p.initializer}`).join(',\n')}\n})`

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

export default JoiSchemaAst
