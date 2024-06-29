import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('gen:types', () => {
  it('runs gen:types cmd', async () => {
    const {stdout} = await runCommand('gen:types')
    expect(stdout).to.contain('hello world')
  })

  it('runs gen:types --name oclif', async () => {
    const {stdout} = await runCommand('gen:types --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
