import React from 'react'
import Helmet from 'react-helmet'

export const HtmlHeader = () => {
  const id = process.env.REACT_APP_GOOGLE_ANALYTICS_ID
  return (
    <Helmet
      htmlAttributes={{
        lang: 'ja',
      }}
      title={'XRP Ledger CSV export for Cryptact'}
      meta={[
        {
          name: 'description',
          content: 'Cryptact向けのXRP LedgerトランザクションのCSVを出力',
        },
        {
          name: 'monetization',
          content: '$ilp.tequ.dev',
        },
      ]}
      link={[
        {
          rel: 'monetization',
          href: 'https://ilp.tequ.dev',
        },
      ]}
      script={[
        {
          src: 'https://donate.xumm.community/donateViaXumm.js',
          defer: '',
        },
      ]}
    >
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />
      <script>
        {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', '${id}'');
        `}
      </script>
    </Helmet>
  )
}
