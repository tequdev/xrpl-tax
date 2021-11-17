import { ButtonGroup, ButtonGroupProps, IconButton } from '@chakra-ui/react'
import * as React from 'react'
import { FaGithub, FaTwitter } from 'react-icons/fa'
import { Logo } from './Logo'

export const SocialMediaLinks = (props: ButtonGroupProps) => (
  <ButtonGroup variant="ghost" color="gray.600" {...props}>
    <IconButton
      as="a"
      href="https://tequ.dev"
      target="_blank"
      aria-label="GitHub"
      icon={<Logo fontSize="20px" />}
    />
    <IconButton
      as="a"
      href="https://github.com/develoQ"
      target="_blank"
      aria-label="GitHub"
      icon={<FaGithub fontSize="20px" />}
    />
    <IconButton
      as="a"
      href="https://twitter.com/_TeQu_"
      target="_blank"
      aria-label="Twitter"
      icon={<FaTwitter fontSize="20px" />}
    />
  </ButtonGroup>
)
