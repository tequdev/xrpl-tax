import { XrplClient } from 'xrpl-client'
import { getBalanceChanges, TransactionAndMetadata } from 'xrpl'
import { hex2string } from './hex-to-string'

type AccountTx = {
  account: string
  ledger_index_max: number
  ledger_index_min: number
  limit: number
  validated: boolean
  transactions: {
    tx: TransactionAndMetadata['transaction'] & {
      date: number
      hash: string
      inLedger: number
    }
    meta: TransactionAndMetadata['metadata']
  }[]
  marker?: string
}

export type Response = {
  Timestamp: string
  ts: string
  Action: OutputAction
  Source: string
  Base: string
  DerivType: string
  DerivDetails: string
  Volume: string
  Price: string
  Counter: string
  Fee: number
  FeeCcy: string
  Comment: string
  TransactionType: string
  LedgerIndex: number
}

type OutputAction =
  | 'BUY'
  | 'SELL'
  | 'PAY'
  | 'MINING'
  | 'SENDFEE'
  | 'TIP'
  | 'REDUCE'
  | 'BONUS'
  | 'LENDING'
  | 'STAKING'
  | 'CASH'
  | 'BORROW'
  | 'RETURN'

interface XrplTransactionHistoryIF {
  setAddress(address: string): void
  getTx(callback: (value: Response) => void): void
}

class XrplTransactionHistory implements XrplTransactionHistoryIF {
  private address: string
  private ledger_index_min: number = -1
  private ledger_index_max: number = -1
  private client: XrplClient
  constructor(address: string, client: typeof XrplClient = XrplClient) {
    this.address = address
    this.client = new client()
  }

  /**
   * set XRPL address
   * @param address
   */
  setAddress(address: string) {
    this.address = address
  }

  setLedgerIndex(min: number, max: number) {
    this.ledger_index_min = min
    this.ledger_index_max = max
  }

  getTx = async (callback: (value: Response) => void) => {
    let marker: string | undefined = undefined
    do {
      const accountTx = (await this.client.send({
        command: 'account_tx',
        account: this.address,
        ledger_index_min: this.ledger_index_min,
        ledger_index_max: this.ledger_index_max,
        limit: 50,
        marker,
      })) as AccountTx
      this.parse(accountTx, callback)
      marker = accountTx.marker
    } while (marker)
  }

  private createReturnValue = (
    tx: AccountTx['transactions'][number],
    {
      action,
      base,
      volume = '',
      price = '',
      counter = 'XRP',
      fee = undefined,
      commentIndex = undefined
    }: {
      action: OutputAction
      base: string
      volume?: string
      price?: string
      counter?: string
      fee?: number | undefined
      commentIndex?: number | undefined
    }
  ): Response => {
    const _fee = fee !== undefined ? fee : (tx.tx.Account === this.address ? Number(tx.tx.Fee) / 1000000 : 0)
    const isFeeTx = action === 'SENDFEE'

    return {
      Timestamp: formatDate(new Date((tx.tx.date + 946684800) * 1000)),
      ts: new Date((tx.tx.date + 946684800) * 1000).toISOString(),
      Action: action,
      Source: 'XRP Ledger',
      Base: base,
      DerivType: '',
      DerivDetails: '',
      Volume: isFeeTx ? `${_fee}` : volume,
      Price: price,
      Counter: counter, //currency === 'XRP' ? 'JPY' : 'XRP',
      Fee: isFeeTx ? 0 : _fee,
      FeeCcy: (isFeeTx || _fee) === 0 ? 'JPY' : 'XRP',
      Comment: tx.tx.hash  + " /" + (commentIndex !== undefined ? commentIndex : ""),
      TransactionType: tx.tx.TransactionType,
      LedgerIndex: tx.tx.inLedger,
    }
  }

  private parse = (result: AccountTx, cb: (value: Response) => void) => {
    result?.transactions.forEach((r) => {
      const { tx, meta } = r
      switch (tx.TransactionType) {
        case 'EscrowCancel':
        case 'EscrowCreate':
        case 'EscrowFinish':
        case 'CheckCancel':
        case 'CheckCash':
        case 'CheckCreate':
        case 'PaymentChannelClaim':
        case 'PaymentChannelCreate':
        case 'PaymentChannelFund':
        case 'DepositPreauth': {
          // 未対応
          const base = 'XRP'
          const counter = 'JPY'
          const action = 'SENDFEE'
          cb({
            ...this.createReturnValue(r, { base, action, counter }),
          })
          return
        }
        case 'AccountDelete':
        case 'AccountSet':
        case 'SetRegularKey':
        case 'SignerListSet':
        case 'TicketCreate':
        case 'TrustSet':
        case 'OfferCancel':
        case 'NFTokenCreateOffer':
        case 'NFTokenCancelOffer':
           {
          // fee only
          const base = 'XRP'
          const counter = 'JPY'
          const action = 'SENDFEE'
          cb(this.createReturnValue(r, { base, action, counter }))
          return
          }
        case 'NFTokenMint':
          {
            // skip if Authorized Mint
            if (tx.Account !== this.address && tx.Issuer === this.address)
              return
            // fee only
            const base = 'XRP'
            const counter = 'JPY'
            const action = 'SENDFEE'
            cb(this.createReturnValue(r, { base, action, counter }))
            return 82418521
          }
        case 'Payment':
        case 'OfferCreate':
        case 'NFTokenAcceptOffer': 
          break
      }

      const mutations =
        getBalanceChanges(meta).find((bc) => bc.account === this.address)
          ?.balances || []
      
      if (tx.TransactionType === 'NFTokenAcceptOffer') {
        if (mutations.length === 0)
          // skip if no change to account balance
          return
      }

      if (
        tx.TransactionType === 'OfferCreate' &&
        mutations.length === 1 &&
        mutations[0].currency === 'XRP'
      ) {
        // create offer only
        const base = 'XRP'
        const counter = 'JPY'
        const action = 'SENDFEE'
        cb(this.createReturnValue(r, { base, action, counter }))
        return
      }

      const mutationData = {
        send: {
          state: false,
          issuer: '',
          currency: '',
          amount: '',
        },
        receive: {
          state: false,
          issuer: '',
          currency: '',
          amount: '',
        },
      }
      mutations.forEach((mutation) => {
        let type: 'receive' | 'send'
        if (Number(mutation.value) === Number(tx.Fee) / 1000000 * (-1)) {
          // skip if fee mutation
          return
        }
        if (Number(mutation.value) > 0) {
          type = 'receive'
        } else {
          type = 'send'
        }
        const currency = !mutation.issuer
          ? 'XRP'
          : `${mutation.issuer}.${mutation.currency}`
        const amount = mutation.value.replace('-', '')

        mutationData[type].state = true
        mutationData[type].issuer = mutation.issuer || ''
        mutationData[type].currency = currency
        mutationData[type].amount = amount
      })

      const hasSend = mutationData.send.state
      const hasReceive = mutationData.receive.state

      let action: Extract<
        OutputAction,
        'BUY' | 'SELL' | 'BONUS' | 'TIP' | 'REDUCE'
      >
      let base: string
      let counter: string
      let price: string | undefined = ''
      let volume: string

      if (hasSend && hasReceive) {
        if (mutationData.send.currency === 'XRP') {
          // XRP => Token
          action = 'BUY'
          base = mutationData.receive.currency
          counter = mutationData.send.currency
          volume = mutationData.receive.amount
          price = String(
            parseFloat(mutationData.send.amount) /
            parseFloat(mutationData.receive.amount)
          )
        } else if (mutationData.receive.currency === 'XRP') {
          // Token => XRP
          action = 'SELL'
          base = mutationData.send.currency
          counter = mutationData.receive.currency
          volume = mutationData.send.amount
          price = String(
            parseFloat(mutationData.receive.amount) /
            parseFloat(mutationData.send.amount)
          )
        } else {
          // Token => Token
          // eslint-disable-next-line no-lone-blocks
          {
            action = 'BUY'
            base = mutationData.receive.currency
            counter = "USD"
            volume = mutationData.receive.amount
            price = base.endsWith('.USD') ? '1' : undefined
            cb(this.createReturnValue(r, { base, action, counter, price, volume, commentIndex: 1 }))
          }
          // eslint-disable-next-line no-lone-blocks
          {
            action = 'SELL'
            base = mutationData.send.currency
            volume = mutationData.send.amount
            counter = "USD"
            price = base.endsWith('.USD') ? '1' : undefined
            cb(this.createReturnValue(r, { base, action, counter, price, volume, commentIndex: 2, fee: 0 }))
          }
          return
        }
      } else {
        if (hasSend) {
          action = 'REDUCE'
          base = mutationData.send.currency
          counter = 'JPY'
          volume = mutationData.send.amount
        } else if (hasReceive) {
          action = 'BONUS'
          base = mutationData.receive.currency
          counter = 'JPY'
          volume = mutationData.receive.amount
        } else {
          const base = 'XRP'
          const counter = 'JPY'
          const action = 'SENDFEE'
          cb(this.createReturnValue(r, { base, action, counter }))
          return
        }
      }

      cb(this.createReturnValue(r, { base, action, counter, price, volume }))
      return
    })
  }
  getUSDXRP = async (ledger_index: number) => {
    const accountTx = (await this.client.send({
      command: 'account_tx',
      account: `rXUMMaPpZqPutoRszR29jtC8amWq3APkx`,
      limit: 1,
      ledger_index_max: ledger_index,
    })) as AccountTx
    if (accountTx.transactions.length === 0) {
      return undefined
    }
    const prices = accountTx.transactions[0].tx
      .Memos!.map((memo) => {
        return hex2string(memo.Memo.MemoData!).split(';')
      })
      .flat()
      .map((p) => Number(p))
    const price =
      prices.reduce((sum, p) => {
        return sum + Number(p)
      }) / prices.length
    return price
  }
}
export const client = new XrplTransactionHistory('')

const formatDate = (d: Date) => {
  return `${d.getFullYear()}/${d.getMonth() + 1
    }/${d.getDate()} ${d.getHours()}:${d.getMinutes()}` //.padStart(2, "0")
    .replace(/\n|\r/g, '')
}
