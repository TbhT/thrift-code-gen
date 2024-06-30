import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('gen', () => {
  it('runs gen cmd', async () => {
    const {stdout} = await runCommand('gen')
    expect(stdout).to.contain('hello world')
  })

  it('runs gen --name oclif', async () => {
    const {stdout} = await runCommand('gen --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
