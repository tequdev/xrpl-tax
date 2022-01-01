type TCryptactCurrency = {
  [key in string]: {
    [key in string]: string
  }
}
const cryptactCurrency: TCryptactCurrency = {
  rBdZkMKuPnzYVVkyL2DrQKV3DsYt5PPVRh: {
    '536D6172744C4F58000000000000000000000000': 'SMARTLOX',
    'SmartLOX': 'SMARTLOX'
  },
  rf8dxyFrYWEcUQAM7QXdbbtcRPzjvoQybK: {
    '536D6172744E4654000000000000000000000000': 'SMARTNFT',
    'SmartNFT': 'SMARTNFT'
  },
  rpakCr61Q92abPXJnVboKENmpKssWyHpwu: {
    '457175696C69627269756D000000000000000000': 'EQ',
    'Equilibrium': 'EQ'
  }
}

export const convertToCryptact = (issuer: string, currency: string): string | undefined => {
  return cryptactCurrency[issuer] && cryptactCurrency[issuer][currency] ? cryptactCurrency[issuer][currency]
      : undefined
}
