import {ThriftDocument, ThriftErrors, parse} from '@creditkarma/thrift-parser'
import dirTree, {DirectoryTree} from 'directory-tree'
import {readFile} from 'node:fs/promises'
import path, {resolve} from 'node:path'

export type ThriftDocumentTree = ThriftDocument | ThriftErrors

export type ThriftDirsTree = Record<`${string}.thrift`, [DirectoryTree, ThriftDocumentTree]>

export type ParserOption = {
  comment: true
  prettyLog: true
  showLineNums: number
}

// export type

export const defaultParserOptions = Object.freeze<ParserOption>({
  comment: true,
  prettyLog: true,
  showLineNums: 5,
})

export const parseContent = (content: string) => parse(content)

export const parseThriftDirs = async (allThriftFilePath: DirectoryTree[]) => {
  const allThriftTypes: ThriftDirsTree = {}
  const files = await Promise.all(allThriftFilePath.map((p) => readFile(p.path)))

  for (const [i, f] of files.entries()) {
    const fileContent = f.toString('utf8')
    const p = allThriftFilePath[i]
    const astTree = parseContent(fileContent)

    allThriftTypes[p.path as `${string}.thrift`] = [p, astTree]
  }

  return allThriftTypes
}

export const readThriftDirs = async (sourceDir: string) => {
  if (!sourceDir) {
    throw new Error('The sourceDir config is expected a relative path or absolute path !')
  }

  const allThriftFilePath: DirectoryTree[] = []

  let fullSourceDirPath = ''
  fullSourceDirPath = path.isAbsolute(sourceDir) ? sourceDir : resolve(process.cwd(), sourceDir)

  dirTree(fullSourceDirPath, {extensions: /\.thrift$/}, (item) => {
    allThriftFilePath.push(item)
  })

  return allThriftFilePath
}

export default class Parser {
  async parse(sourceDir: string) {
    const dirs = await readThriftDirs(sourceDir)
    return parseThriftDirs(dirs)
  }
}
