import * as React from 'react'
import { ChangeEvent, useState } from 'react'
import {
  ChakraProvider,
  Box,
  Button,
  theme,
  Flex,
  Stack,
  Input,
  Checkbox,
  Stat,
  StatLabel,
  StatHelpText,
  Center,
  Container,
  SimpleGrid,
} from '@chakra-ui/react'
import { CSVLink } from 'react-csv'

import { client, Response } from './lib/xrpl-tx'
import { XummDonation } from './utils/XummDonation'
import { useWindowDimensions } from './Hooks/useWindowDimensions'

import { Header } from './Header'
import { Table, Thead, Tbody, Tr, Th, Td } from './Table'
import { Footer } from './Footer'

const localStrageKey = 'xrpl.address.tax.export'

export const App = () => {
  const app = client
  const [searchAddress, setSearchAddress] = useState(
    localStorage.getItem(localStrageKey) || ''
  )
  const { width: winWidth } = useWindowDimensions()
  const [accountTx, setAccountTx] = useState<(Response & { use: boolean })[]>(
    []
  )
  const [canExport, setCanExport] = useState<boolean | null>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    switch (event.target.name) {
      case 'searchAddress':
        setSearchAddress(event.target.value)
    }
  }

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    window.localStorage.setItem(localStrageKey, searchAddress)
    await searchTx()
  }

  const searchTx = async () => {
    setCanExport(false)
    app.setAddress(searchAddress)
    setAccountTx([])
    const tmpAccountT: typeof accountTx = []
    await app.getTx((tx) => {
      const use = true
      tmpAccountT.push({ ...tx, use })
      tx.Base =
        tx.Base.split('.').length > 1
          ? tx.Base.split('.')[1]
          : tx.Base.split('.')[0]
      setAccountTx((prevTx) => prevTx.concat([{ ...tx, use }]))
    })

    const pricedAccountTx = await Promise.all(
      tmpAccountT.map(async (tx) => {
        const price = await fetchPrice(tx)

        const base =
          tx.Base.split('.').length > 1
            ? tx.Base.split('.')[1]
            : tx.Base.split('.')[0]
        const counter = price && tx.Counter === 'JPY' ? 'USD' : tx.Counter
        return {
          ...tx,
          Price: price,
          Base: base,
          Counter: counter,
        }
      })
    )

    setAccountTx([...pricedAccountTx])
    setCanExport(true)
  }
  const headers = [
    'use',
    'timestamp',
    'action',
    'source',
    'base',
    'derivType',
    'derivDetails',
    'volume',
    'price',
    'counter',
    'fee',
    'feeCcy',
    'comment',
  ]

  const TableHeader = () => {
    const header = headers.filter((h) => {
      return !['source', 'derivType', 'derivDetails'].some((t) => t === h)
    })
    return (
      <Thead>
        <Tr>
          {header.map((h, index) => {
            return (
              <Th textAlign="center" key={index}>
                {h}
              </Th>
            )
          })}
        </Tr>
      </Thead>
    )
  }

  const fetchPrice = async (tx: Response) => {
    const fetchIOUXRP = async () => {
      const base = `${tx.Base}`.split('.').reverse().join('+')
      const counter =
        tx.Counter === 'JPY'
          ? 'XRP'
          : `${tx.Counter}`.split('.').reverse().join('+')
      const timestamp = `${tx.ts}`
      const response = await fetch(
        `https://data.ripple.com/v2/exchange_rates/${base}/${counter}?date=${timestamp}`
      )
      const data = await response.json()
      return data.rate as number
    }
    const fetchXRPUSD = async (ledger_index: number) => {
      return await app.getUSDXRP(ledger_index)
    }
    if (tx.Base === 'XRP' && tx.Counter === 'JPY') {
      return ''
    }
    // fetch IOU/XRP
    const iouxrpPrice = await fetchIOUXRP()
    if (tx.Counter !== 'JPY') {
      return iouxrpPrice.toString()
    }
    if (tx.Action === 'BUY' || tx.Action === 'SELL') {
      return iouxrpPrice.toString()
    }
    if (iouxrpPrice === 0) {
      return '0'
    }

    // fetch XRP/USD
    const xrpusdPrice = await fetchXRPUSD(tx.LedgerIndex)
    if (!xrpusdPrice) {
      return ''
    } else {
      return iouxrpPrice * xrpusdPrice + ''
    }
  }

  const csvData = () => {
    const header = headers
      .filter((f) => f !== 'use')
      .map((h) => {
        return h.substr(0, 1).toUpperCase() + h.substr(1, h.length - 1)
      })
    return {
      header,
      content: accountTx
        .filter((tx) => tx.use)
        .map((tx) => {
          let obj = {}
          for (let t in tx) {
            const isCsvExistsKey = header.some((h) => {
              return t.toUpperCase() === h.toUpperCase()
            })
            if (isCsvExistsKey) {
              obj = { ...obj, [t]: String(tx[t as keyof typeof tx]) }
            }
          }
          return obj
        }),
    }
  }

  const TableContent = ({ tx }: { tx: typeof accountTx[number] }) => {
    const onChangeCheck = (event: ChangeEvent<HTMLInputElement>) => {
      setAccountTx(
        accountTx.map((acc) => ({
          ...acc,
          use: acc.Comment === tx.Comment ? event.target.checked : acc.use,
        }))
      )
    }
    return (
      <Tr>
        {/* use */}
        <Td>
          <Checkbox isChecked={tx.use} onChange={onChangeCheck} />
        </Td>
        {/* timestamp */}
        <Td>{tx.Timestamp}</Td>
        {/* action */}
        <Td textAlign="center">{tx.Action}</Td>
        {/* source */}
        {/* <Td>{tx.Source}</Td> */}
        {/* base */}
        <Td textAlign="center">{tx.Base}</Td>
        {/* derivType */}
        {/* <Td>{tx.DerivType}</Td> */}
        {/* derivDetails */}
        {/* <Td>{tx.DerivDetails}</Td> */}
        {/* volume */}
        <Td textAlign="end">{tx.Volume}</Td>
        {/* price */}
        <Td textAlign="end">{tx.Price.substr(0, 6)}</Td>
        {/* counter */}
        <Td textAlign="center">{tx.Counter}</Td>
        {/* fee */}
        <Td textAlign="end">{tx.Fee}</Td>
        {/* feeCcy */}
        <Td textAlign="center">{tx.FeeCcy}</Td>
        {/* comment */}
        <Td>
          <a
            href={'https://xrpscan.com/tx/' + tx.Comment}
            target="_blank"
            rel="noreferrer"
          >
            {tx.Comment.substr(0, 7)}...
          </a>
        </Td>
      </Tr>
    )
  }

  return (
    <ChakraProvider theme={theme}>
      <Container centerContent maxWidth="1200px">
        <Header mt="4" mb="6" />
        <Flex p={[0, 4]} maxWidth="460px" w="100%">
          <Input
            name="searchAddress"
            m="1"
            value={searchAddress}
            onChange={handleChange}
            placeholder="r..."
          />
          <Button m="1" onClick={handleClick}>
            検索
          </Button>
        </Flex>
        <SimpleGrid py={2} maxW="1200px" columns={[1, 1, 3]} spacing="4">
          <Box p="4" border="1px" borderColor="#ccc">
            <Stat>
              <StatLabel>Account:</StatLabel>
              <StatHelpText>{searchAddress}</StatHelpText>
            </Stat>
          </Box>
          <Box p="4" border="1px" borderColor="#ccc">
            <Stat>
              <StatLabel>Transactions:</StatLabel>
              <StatHelpText>{accountTx.length}</StatHelpText>
            </Stat>
          </Box>
          <Box p="4" border="1px" borderColor="#ccc">
            <Center>
              <XummDonation account="rQQQrUdN1cLdNmxH4dHfKgmX5P4kf3ZrM" />
            </Center>
          </Box>
        </SimpleGrid>

        <Center pt="6">
          <CSVLink data={csvData().content} headers={csvData().header}>
            <Button
              colorScheme={canExport ? 'blue' : 'gray'}
              isLoading={canExport === false}
              disabled={!canExport}
              children={'Export(CSV)'}
            />
          </CSVLink>
        </Center>
        {/* 取引履歴 */}
        <Stack pt="6" minHeight="400px" w="100%">
          <Table
            size={1440 > winWidth ? 'xs' : 'md'}
            fontSize="12"
            variant="striped"
          >
            <TableHeader />
            <Tbody>
              {accountTx.map((tx) => {
                return <TableContent tx={tx} key={tx.Comment} />
              })}
            </Tbody>
          </Table>
        </Stack>
        <Footer />
      </Container>
    </ChakraProvider>
  )
}
