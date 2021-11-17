import { AnyJson, XrplClient } from 'xrpl-client'
import { XrplTransactionHistory } from './xrpl-tx'

jest.mock('xrpl-client')

const mockedClient = (values: AnyJson | AnyJson[]) => {
  if (values instanceof Array) {
    for (const value of values) {
      jest.spyOn(XrplClient.prototype, 'send').mockResolvedValueOnce(value)
    }
  } else {
    const value = values
    jest.spyOn(XrplClient.prototype, 'send').mockResolvedValue(value)
  }
  return new XrplTransactionHistory('', XrplClient)
}

describe('call spyon', () => {
  it('call spyon', () => {
    const spyon = jest.spyOn(XrplClient.prototype, 'send').mockResolvedValue({})
    const client = new XrplTransactionHistory('', XrplClient)
    client.getTx()
    expect(spyon).toHaveBeenCalled()
  })
})

describe('simple payment', () => {
  it('reveive', () => {
    const client = mockedClient([{}])
    client.getTx()
  })
  it('send', () => {})
})
