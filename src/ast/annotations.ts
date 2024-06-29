import {Annotation} from '@creditkarma/thrift-parser'

const commonAnnotationParse = (annotations: Annotation[] | undefined, cb: (a: Annotation, s: Set<string>) => void) => {
  const s = new Set<string>()

  if (!annotations) {
    return s
  }

  const validatorAnnotations = annotations.filter((a) =>
    Boolean(a.value?.value && /^(v|validator)$/i.test(a.name.value.trim())),
  )

  if (validatorAnnotations.length > 0) {
    for (const annotation of validatorAnnotations) {
      if (annotation.value?.value) {
        cb(annotation, s)
      }
    }
  }

  return s
}

export const parseJoiAnnotations = (annotations: Annotation[] | undefined) =>
  commonAnnotationParse(annotations, (a, s) => {
    const r = a.value?.value.trim().split(/[\s,.|]/)

    if (r)
      for (let v of r) {
        // fill the "()" when annotation is not ends with that
        if (v && !/\((.*)\)/.test(v.trim())) {
          v = `${v}()`
        }

        if (v) {
          s.add(v)
        }
      }
  })

export const parseCVAnnotations = (annotations: Annotation[] | undefined) =>
  commonAnnotationParse(annotations, (a, s) => {
    const r = a.value?.value
      .trim()
      .split(/[\s,|]/)
      .filter(Boolean)

    if (r) for (const c of r) s.add(c)
  })

export const parseCVImports = (annos: string[], imports: Set<string>) => {
  for (const a of annos) {
    const m = /(\w+)\(.*\)/.exec(a)
    if (m) {
      imports.add(m[1])
    }
  }

  return imports
}

export const parseZodAnnotations = (annotations: Annotation[] | undefined) =>
  commonAnnotationParse(annotations, (a, s) => {
    const r = a.value?.value
      .trim()
      .split(/[\s,.|]/)
      .filter(Boolean)

    if (r)
      for (let c of r) {
        // fill the "()" when annotation is not ends with that
        if (c && !/\((.*)\)/.test(c.trim())) {
          c = `${c}()`
        }

        if (c) {
          s.add(c)
        }
      }
  })
