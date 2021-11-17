import { chakra } from '@chakra-ui/react'

type XummDonationProps = {
  account: string
}
export const XummDonation = ({ account }: XummDonationProps) => {
  return (
    <a
      href={`https://xumm.app/detect/request:${account}`}
      target="_blank"
      rel="noreferrer"
    >
      <chakra.div className="mx-auto xumm-donate-button">
        <chakra.img
          id="xumm-donate-button"
          className="donate-button"
          src="https://donate.xumm.community/xummDonate.svg"
          alt="Donate via XUMM"
        />
      </chakra.div>
    </a>
  )
}
