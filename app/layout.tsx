import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'FixerBuddy — Evin için pratik yardım', description: 'Tamir sorularına güvenli ve anlaşılır, AI destekli yanıtlar.' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="tr"><body>{children}</body></html> }
