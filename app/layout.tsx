import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Turkey Radar Map',
  description: 'Created with Next.js, Tailwind CSS, and OpenStreetMap',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
