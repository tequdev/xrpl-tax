import React from 'react'
import { Table as ChakraTable, TableProps } from '@chakra-ui/react'
import { Provider } from '../utils'
import './styles.css'

export const Table = (props: TableProps) => {
  const { className, ...rest } = props
  const classes = `${className || ''} responsiveTable`

  return (
    <Provider value={{}}>
      <ChakraTable {...rest} className={classes} />
    </Provider>
  )
}
