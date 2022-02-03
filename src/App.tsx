import * as React from 'react'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
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
  NumberInput,
  NumberInputField,
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  chakra,
} from '@chakra-ui/react'
import { CSVLink } from 'react-csv'

import { client, Response } from './lib/xrpl-tx'
import { XummDonation } from './utils/XummDonation'
import { useWindowDimensions } from './Hooks/useWindowDimensions'

import { Header } from './Header'
import { Table, Thead, Tbody, Tr, Th, Td } from './Table'
import { Footer } from './Footer'
import { _sleep } from './utils/sleep'
import { convertToCryptact } from './lib/cryptactCurrency'
import { hex2string } from './lib/hex-to-string'

const localStrageAddressKey = 'xrpl.address.tax.address'

export const App = () => {
  const app = client
  const { width: winWidth } = useWindowDimensions()

  // Address
  const [searchAddress, setSearchAddress] = useState(
    localStorage.getItem(localStrageAddressKey) || ''
  )

  const [ledgerIndex, setLedgerIndex] = useState({
    min: null as number | null,
    max: null as number | null,
  })
  // Accouunt Tx
  const [accountTx, setAccountTx] = useState<(Response & { use: boolean })[]>(
    []
  )

  // Price fetch count
  const [priceFetchedCnt, setPriceFetchedCnt] = useState(0)

  const [canExport, setCanExport] = useState<boolean | null>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    switch (event.target.name) {
      case 'searchAddress':
        setSearchAddress(event.target.value)
        break
      case 'ledgerIndexMin':
        setLedgerIndex({ ...ledgerIndex, min: parseInt(event.target.value) })
        break
      case 'ledgerIndexMax':
        setLedgerIndex({ ...ledgerIndex, max: parseInt(event.target.value) })
        break
    }
  }

  useEffect(() => {
    const f = async () => {
      if (accountTx.length > 0) {
        try {
          await setPrice(accountTx)
        } finally {
          setCanExport(true)
        }
      }
    }
    f()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    localStorage.setItem(localStrageAddressKey, searchAddress)
    await searchTx()
  }

  const searchTx = async () => {
    setCanExport(false)
    app.setAddress(searchAddress)
    const ledgerIdxMin = ledgerIndex.min || -1
    const ledgerIdxMax = ledgerIndex.max || -1
    app.setLedgerIndex(ledgerIdxMin, ledgerIdxMax)
    setAccountTx([])
    const tmpAccountTx: typeof accountTx = []
    await app.getTx((tx) => {
      const use = true
      tmpAccountTx.push({ ...tx, use })
      setAccountTx((prevTx) => prevTx.concat([{ ...tx, use }]))
    })
    try {
      await setPrice(tmpAccountTx)
    } finally {
      setCanExport(true)
    }
  }

  const setPrice = async (accTx: typeof accountTx) => {
    if (accTx.length === 0) {
      return
    }
    const pricedTx: typeof accountTx = accTx
    for (let index = 0; index < accTx.length; index++) {
      setPriceFetchedCnt(Number(index))
      const tx = accTx[index]
      let price = tx.Price
      try {
        price = await fetchPrice(tx)
      } catch (e) {
        const limitTime = parseFloat(
          ((e as Error).message as string)
            .replace(/.*in /g, '')
            .replace('sec', '')
        )
        await _sleep(limitTime)
        index--
        price = ''
      } finally {
        pricedTx[index] = {
          ...tx,
          Price: price,
        }
        setAccountTx([...pricedTx])
      }
    }

    setAccountTx([...pricedTx])
  }

  const dispAccountTx = useMemo(() => {
    return accountTx.map((tx) => {
      const base =
        tx.Base.split('.').length > 1
          ? convertToCryptact(tx.Base.split('.')[0], tx.Base.split('.')[1]) ??
            tx.Base.split('.')[1]
          : tx.Base.split('.')[0]
      const counter = tx.Price && tx.Counter === 'JPY' ? 'USD' : tx.Counter
      return {
        ...tx,
        Base: base,
        Counter: counter,
      }
    })
  }, [accountTx])

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
    if (tx.Price) {
      return tx.Price
    }
    const fetchIOUXRP = async (): Promise<number> => {
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
      if (!data.rate) {
        throw new Error(data.error)
      }
      return data.rate as number
    }
    const fetchXRPUSD = async (ledger_index: number) => {
      return await app.getUSDXRP(ledger_index)
    }
    if (tx.Base === 'XRP' && tx.Counter === 'JPY') {
      return ''
    }
    // fetch IOU/XRP
    let iouxrpPrice: number
    if (!tx.Price) {
      iouxrpPrice = await fetchIOUXRP()
    } else {
      iouxrpPrice = parseFloat(tx.Price)
    }
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
      content: dispAccountTx
        .filter((tx) => tx.use)
        .map((tx) => {
          let obj = {}
          for (let t in tx) {
            const isCsvExistsKey = header.some((h) => {
              return t.toUpperCase() === h.toUpperCase()
            })
            if (isCsvExistsKey) {
              obj = {
                ...obj,
                [t]: String(tx[t as keyof typeof tx]),
                Base: convertCurrency(String(tx['Base'])),
              }
            }
          }
          return obj
        }),
    }
  }
  
  const convertCurrency = (currency: string) => {
    if (currency.length > 30) {
      return hex2string(currency).replace(/\0/g, '')
    } else {
      return currency
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
      <Tr key={tx['Comment']}>
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
        <Td textAlign="center">{convertCurrency(tx.Base)}</Td>
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
            {tx.LedgerIndex} / {tx.Comment.substr(0, 7)}...
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

        <Flex p={[0, 4]} maxWidth="460px" w="100%">
          <Accordion allowToggle width="100%">
            <AccordionItem>
              <h2>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    詳細検索
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                <Flex>
                  <NumberInput mr={1} min={0}>
                    <NumberInputField
                      name="ledgerIndexMin"
                      value={ledgerIndex.min || ''}
                      onChange={handleChange}
                      placeholder="最小レジャー番号"
                    />
                  </NumberInput>
                  <chakra.div pt="2">
                    <chakra.span verticalAlign="baseline">〜</chakra.span>
                  </chakra.div>
                  <NumberInput ml={1} min={0}>
                    <NumberInputField
                      name="ledgerIndexMax"
                      value={ledgerIndex.max || ''}
                      onChange={handleChange}
                      placeholder="最大レジャー番号"
                    />
                  </NumberInput>
                </Flex>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
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
              <StatHelpText>{dispAccountTx.length}</StatHelpText>
              <StatLabel>LastTimestamp:</StatLabel>
              <StatHelpText>
                {dispAccountTx.length > 0
                  ? dispAccountTx[dispAccountTx.length - 1].Timestamp
                  : ''}
              </StatHelpText>
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
              loadingText={
                accountTx.length > 0 && priceFetchedCnt > 0
                  ? `${priceFetchedCnt} / ${accountTx.length}`
                  : ''
              }
              disabled={!dispAccountTx.length}
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
              {dispAccountTx.map((tx) => {
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
