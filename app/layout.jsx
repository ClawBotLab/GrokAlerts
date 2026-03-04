export const metadata = {
  title: 'Grok Alerts',
  description: 'Live alert intelligence game',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#030910' }}>
        {children}
      </body>
    </html>
  )
}
