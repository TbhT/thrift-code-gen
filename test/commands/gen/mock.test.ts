import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('gen:mock', () => {
  it('runs gen:mock cmd', async () => {
    const {stdout} = await runCommand('gen:mock')
    expect(stdout).to.contain('hello world')
  })

  it('runs gen:mock --name oclif', async () => {
    const {stdout} = await runCommand('gen:mock --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
