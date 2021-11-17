import { Box, Stack } from '@chakra-ui/react'
import React from 'react'
import { Copyright } from './Copyright'
import { SocialMediaLinks } from './SocialMediaLinks'

export const Footer = () => {
  return (
    <Box
      as="footer"
      role="contentinfo"
      mx="auto"
      maxW="7xl"
      pt="12"
      pb="4"
      px={{ base: '4', md: '8' }}
    >
      <Stack>
        <Stack
          direction="row"
          spacing="4"
          align="center"
          justify="space-between"
        >
          <SocialMediaLinks />
        </Stack>
        <Copyright alignSelf={{ base: 'center' }} />
      </Stack>
    </Box>
  )
}
