import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { I18nProvider, LanguageSelect } from '@flowbond/i18n'
import { RTL, langFromCookie } from '@flowbond/i18n/dictionaries'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })

export const metadata: Metadata = {
  title: 'FlowBond Identity',
  description: 'One identity for the whole FlowBond ecosystem. Sovereign by design.',
}

export const viewport: Viewport = {
  themeColor: '#07070f',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const saved = (await cookies()).get('fb_lang')?.value
  const { lang, hadCookie } = langFromCookie(saved)
  const dir = RTL.includes(lang) ? 'rtl' : 'ltr'

  return (
    <html lang={lang} dir={dir} className={`${inter.variable} dark`}>
      <body className="font-sans">
        <I18nProvider initialLang={lang} hadCookie={hadCookie}>
          <LanguageSelect />
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
