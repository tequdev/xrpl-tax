import { Box, Text } from '@chakra-ui/react'
import React, { ComponentProps } from 'react'

type HeadProps = ComponentProps<typeof Box>

export const Header = (props: HeadProps) => {
  return (
    <Box {...props}>
      <Text fontSize={['1.7rem', '2.5rem']}>XRP Ledger Tax export</Text>
      <Text align="end" fontSize={['1rem']}>
        for Cryptact
      </Text>
    </Box>
  )
}
