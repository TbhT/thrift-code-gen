import {Annotation} from '@creditkarma/thrift-parser'
import toCamelCase from 'camelcase'
import {snakeCase as toSnakeCase} from 'snake-case'

type AnnotationKey = 'contentType' | 'method' | 'path' | 'remote' | 'separator'

export type TsGenAnnotation = {
  [key in AnnotationKey]?: string
}

export function makeMethodAnnotations(
  serviceName: string,
  fnName: string,
  annotations: Annotation[] = [],
  type: 'camel' | 'snake' = 'snake',
) {
  if (!annotations) {
    return null
  }

  const paramsMap: Record<string, string | true> = {}
  const resultMap: TsGenAnnotation = {}

  for (const annotation of annotations) {
    const key = annotation.name.value
    if (key.startsWith('api.') || key.startsWith('a.')) {
      const newKey = key.replace('api.', '') || key.replace('a.', '')
      paramsMap[newKey] = annotation.value?.value ?? true
    } else {
      paramsMap[key] = annotation.value?.value ?? true
    }
  }

  if (annotations.length === 1 && !/(api|a)(?:\.(\w+))?/.test(annotations[0].name.value)) {
    throw new Error(
      `annotation is likely not completed at line:${annotations[0].loc.start.line} column:${annotations[0].loc.start.column}`,
    )
  }

  if (annotations.length === 0) {
    return null
  }

  if (!paramsMap.method) {
    throw new Error(
      `annotation for method is invalid at line: ${annotations[0].loc.start.line} column:${annotations[0].loc.start.column}`,
    )
  }

  if (paramsMap.path) {
    resultMap.path = paramsMap.path as string
  } else if (type === 'camel') {
    resultMap.path =
      '/' +
      [
        toCamelCase(serviceName, {
          pascalCase: true,
          preserveConsecutiveUppercase: true,
        }),
        toSnakeCase(fnName),
      ].join('/')
  } else {
    resultMap.path = '/' + [toSnakeCase(serviceName), toSnakeCase(fnName)].join('/')
  }

  if (!paramsMap.contentType) {
    paramsMap.contentType = 'json'
  } else if (paramsMap.contentType !== 'json') {
    throw new Error(`unsupported ${paramsMap.contentType}`)
  }

  if (paramsMap.method !== true) {
    resultMap.method = paramsMap.method.toLowerCase()
  }

  return resultMap
}

export function makeServiceAnnotations(annotations?: Annotation[]) {
  if (!annotations) {
    return
  }

  const paramsMap: Record<string, string> = {}

  for (const annotation of annotations) {
    const key = annotation.name.value
    paramsMap[key] = annotation.value?.value ?? 'true'
  }

  const {value} = annotations[0].name
  const result: Record<string, string> = {}

  const flag = value.includes('.') ? value.split('.')[1] : value
  annotations.shift()

  if (!['forward'].includes(flag)) {
    return
  }

  result.type = 'forward'

  for (const key of Object.keys(paramsMap)) {
    if (key.startsWith('rpc.') || key.startsWith('r.')) {
      const newKey = key.replace('rpc.', '') || key.replace('r.', '')

      result[newKey] = paramsMap[key]
    }
  }

  return result
}
