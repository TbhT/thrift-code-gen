import {MockPluginOptions} from '@/config/normalization'
import {Annotation} from '@creditkarma/thrift-parser'

type AnnotationType = 'bigint' | 'boolean' | 'number' | 'string'

const makeDefaultFaker = (type: AnnotationType) => {
  switch (type) {
    case 'boolean': {
      return 'faker.datatype.boolean()'
    }

    case 'string': {
      return 'faker.datatype.string()'
    }

    case 'number': {
      return 'faker.datatype.number()'
    }

    case 'bigint': {
      return 'faker.datatype.bigInt()'
    }

    default: {
      return ''
    }
  }
}

const makeStringFaker = (annotations: Annotation[], _mockOptions: MockPluginOptions): string => {
  const anno = annotations[0]

  const annoValue = anno?.value?.value

  if (!anno || !annoValue) {
    return makeDefaultFaker('string')
  }

  if (/^(faker\.|f.)?(.+)\.(.+)/.test(annoValue)) {
    if (annoValue.startsWith('faker.') || annoValue.startsWith('f.')) {
      return annoValue
    }

    return `faker.${annoValue}`
  }

  return makeDefaultFaker('string')
}

const makeNumberFaker = (annotations: Annotation[], mockOptions: MockPluginOptions) => {
  const anno = annotations[0]

  const annoValue = anno?.value?.value

  if (!anno || !annoValue) {
    return makeDefaultFaker('number')
  }

  switch (mockOptions.i64As) {
    case 'number': {
      return 'faker.datatype.number()'
    }

    case 'string': {
      return `\`\${faker.datatype.number({
      max: 1844674407,
      min: 1
    })}\${faker.datatype.number(3709551615)}\``
    }

    case 'bigint': {
      return 'faker.datatype.bigInt()'
    }
  }

  return makeDefaultFaker('number')
}

export const makeFaker = (
  annotations: Annotation[] | undefined,
  type: AnnotationType,
  mockOptions: MockPluginOptions,
) => {
  if (!annotations) {
    return makeDefaultFaker(type)
  }

  const filterAnnotations = annotations.filter((a) => /(mock|m)$/.test(a.name.value))

  if (type === 'string') {
    return makeStringFaker(filterAnnotations, mockOptions)
  }

  if (type === 'number') {
    return makeNumberFaker(filterAnnotations, mockOptions)
  }

  if (type === 'boolean') {
    return makeDefaultFaker('boolean')
  }

  if (type === 'bigint') {
    return makeDefaultFaker('bigint')
  }

  return ''
}

export const getFakerFromAnnotations = (annotations: Annotation[] | undefined) => {
  if (!annotations) {
    return
  }

  const filterAnnotation = annotations.find((a) => /(mock|m)$/.test(a.name.value))

  if (filterAnnotation) {
    return filterAnnotation.value?.value
  }
}
