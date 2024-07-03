import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('gen:validator', () => {
  it('runs gen:validator cmd', async () => {
    const {stdout} = await runCommand('gen:validator')
    expect(stdout).to.contain('hello world')
  })

  it('runs gen:validator --name oclif', async () => {
    const {stdout} = await runCommand('gen:validator --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
