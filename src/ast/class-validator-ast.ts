import {parseCVAnnotations, parseCVImports} from '@/ast/annotations'
import ValidatorSchemaAst from '@/ast/validator-schema-ast'
import {listTypeReg} from '@/config'
import {
  Annotation,
  EnumDefinition,
  StructDefinition,
  SyntaxType,
  TypedefDefinition,
  UnionDefinition,
} from '@creditkarma/thrift-parser'
import assert from 'node:assert'
import {ClassDeclarationStructure, PropertyDeclarationStructure, StructureKind} from 'ts-morph'

class ClassValidatorSchemaAst extends ValidatorSchemaAst<string[]> {
  protected allIncludedNameImports = new Set<string>()

  protected clsDeclsStructure: ClassDeclarationStructure[] = []

  emit() {
    super.emit()
    assert(this.sourceFile)
    this.sourceFile.addClasses(this.clsDeclsStructure)
  }

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
      trailingTrivia: (writer) => writer.newLine(),
    })

    this.thriftTypesPending.set(name, 1)
  }

  emitStruct(def: StructDefinition | UnionDefinition) {
    const {members, name} = this.stringifyStruct(def)
    const flag = this.thriftTypesPending.get(name)

    if (flag === undefined) {
      this.thriftTypesPending.set(name, 0)
    }

    if (flag === 1) {
      return
    }

    const properties = this.resolveStruct(name, members)
    assert(this.sourceFile)

    // for performance, it should be added first and loaded to ts-morph finally.
    this.clsDeclsStructure.push({
      isExported: true,
      kind: StructureKind.Class,
      name,
      properties,
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

    assert(this.sourceFile)
    this.sourceFile.addTypeAlias({
      isExported: true,
      name,
      trailingTrivia(w) {
        w.newLineIfLastNot()
      },
      type,
    })

    this.thriftTypesPending.set(name, 1)
  }

  importThirdPartyModule() {
    // it's not necessary to add import from here
    assert(this.sourceFile)
    this.sourceFile.addImportDeclaration({
      moduleSpecifier: 'class-validator',
      namedImports: [...this.allIncludedNameImports],
    })
  }

  resolveBool(_type: string, optional: boolean, annotations?: Annotation[] | undefined): string[] {
    const result: string[] = []

    if (optional) {
      result.push('IsOptional()')
      this.allIncludedNameImports.add('IsOptional')
    } else {
      result.push('IsDefined()')
      this.allIncludedNameImports.add('IsDefined')
    }

    result.push('IsBoolean()')
    this.allIncludedNameImports.add('IsBoolean')

    const annos = parseCVAnnotations(annotations)
    result.push(...annos)

    // add named import from class-validator
    parseCVImports(result, this.allIncludedNameImports)

    return [...new Set(result)]
  }

  resolveEnum(def: EnumDefinition, _optional: boolean) {
    const parsedEnumValues = this.getEnumValues(def)
    const result: string[] = []

    if (parsedEnumValues.length > 0) {
      const s = parsedEnumValues.map((e, i) => `${i}: ${e}`).join(', ')
      result.push(`IsEnum({ ${s} })`)
      this.allIncludedNameImports.add('IsEnum')
    }

    const annos = parseCVAnnotations(def.annotations?.annotations)
    result.push(...annos)

    const finalResult = [...new Set(result)]
    parseCVImports(finalResult, this.allIncludedNameImports)

    return finalResult
  }

  resolveIdentityType(type: string, optional: boolean, annotations?: Annotation[]): string[] {
    const realType = super.resolveIdentityThriftType(type)
    const result: string[] = []

    const flag = this.thriftTypesPending.get(type)

    if (flag === 0) {
      // when recycle reference, class-validator will have no decorators
      return []
    }

    if (optional) {
      result.push('IsOptional()')
      this.allIncludedNameImports.add('IsOptional')
    } else {
      result.push('IsDefined()')
      this.allIncludedNameImports.add('IsDefined')
    }

    switch (realType.type) {
      case SyntaxType.StructDefinition:
      case SyntaxType.UnionDefinition: {
        if (!type.includes('.')) {
          this.emitStruct(realType)
        }

        result.push('ValidateNested()')
        this.allIncludedNameImports.add('ValidateNested')

        break
      }

      case SyntaxType.EnumDefinition: {
        this.emitEnum(realType)
        return this.resolveEnum(realType, optional)
      }

      case SyntaxType.TypedefDefinition: {
        const s = this.resolveTypedefType(realType.name.value, annotations)

        result.push(...s)

        break
      }
      // No default
    }

    const annos = parseCVAnnotations(annotations)
    result.push(...annos)

    const r = result.filter(Boolean)
    parseCVImports(r, this.allIncludedNameImports)

    return [...new Set(r)]
  }

  resolveListType(type: string, optional: boolean, annotations?: Annotation[]) {
    let regResult: RegExpExecArray | null
    const result = new Set<string>()

    if ((regResult = listTypeReg.exec(type))) {
      const resultType = regResult[1] || regResult[2]
      const generalResult = this.resolveGeneralType(resultType, optional, annotations)

      if (!generalResult) {
        throw new Error(`type: ${type} is empty !`)
      }

      // TODO: should the list type added to here ?
      // generalResult.forEach((s) =>
      //   this.allIncludedNameImports.add(s.slice(0, -2))
      // );
      // generalResult.forEach(g => result.add(g));

      this.allIncludedNameImports.add('IsArray')
      result.add('IsArray()')
    }

    if (optional) {
      result.add('IsOptional()')
      this.allIncludedNameImports.add('IsOptional')
    } else {
      result.add('IsDefined()')
      this.allIncludedNameImports.add('IsDefined')
    }

    const annos = parseCVAnnotations(annotations)
    const r = [...result, ...annos]
    parseCVImports(r, this.allIncludedNameImports)

    return [...new Set(r)]
  }

  resolveNumber(_type: string, optional: boolean, annotations: Annotation[] | undefined): string[] {
    const result: string[] = []

    if (optional) {
      result.push('IsOptional()')
      this.allIncludedNameImports.add('IsOptional')
    } else {
      result.push('IsDefined()')
      this.allIncludedNameImports.add('IsDefined')
    }

    result.push('IsNumber()')
    this.allIncludedNameImports.add('IsNumber')

    const annos = parseCVAnnotations(annotations)
    result.push(...annos)
    parseCVImports(result, this.allIncludedNameImports)

    return [...new Set(result)]
  }

  resolveRecordType(_type: string, _optional: boolean, _annotations: Annotation[] | undefined): string[] {
    // TODO: should we implement it ?
    return []
  }

  resolveString(_type: string, optional: boolean, annotations: Annotation[] | undefined): string[] {
    const result: string[] = []

    if (optional) {
      result.push('IsOptional()')
      this.allIncludedNameImports.add('IsOptional')
    } else {
      result.push('IsDefined()')
      this.allIncludedNameImports.add('IsDefined')
    }

    result.push('IsString()')
    this.allIncludedNameImports.add('IsString')

    const annos = parseCVAnnotations(annotations)
    result.push(...annos)
    parseCVImports(result, this.allIncludedNameImports)

    return [...new Set(result)]
  }

  resolveStruct(_name: string, fields: Record<string, unknown>[]) {
    return fields.map((m) => {
      let hasQuestionToken

      if (m.requiredness === 'required') {
        hasQuestionToken = false
      } else if (m.requiredness === 'optional') {
        hasQuestionToken = true
      } else {
        hasQuestionToken = true
      }

      const initializer = this.resolveGeneralType(
        m.type as string,
        hasQuestionToken,
        m.annotations as Annotation[] | undefined,
      )

      return {
        decorators: initializer.map((i) => ({
          name: i,
        })),
        leadingTrivia(writer) {
          writer.newLine()
        },
        name: m.name,
        type: m.type,
      }
    }) as PropertyDeclarationStructure[]
  }
}

export default ClassValidatorSchemaAst
