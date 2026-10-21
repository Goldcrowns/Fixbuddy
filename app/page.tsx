'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  ArrowUp, Camera, Check, Home, Menu, MessageCircle, Mic,
  Plus, QrCode, ScanLine, Settings, ShieldCheck, Sparkles, Wrench, X,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────── */
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  solved?: boolean
  qr?: string
}

const STARTERS = [
  { icon: Wrench, title: 'Musluk su kaçırıyor', hint: 'Sıhhi tesisat' },
  { icon: Sparkles, title: 'Duvarı nasıl delerim?', hint: 'Matkap & dübel' },
  { icon: Home, title: 'Çamaşır makinesi çalışmıyor', hint: 'Beyaz eşya' },
]

const solvedPattern =
  /çözüm|sorun.*(çözüld|gider)|tamamlandı|düzeldi|başarılı|uygula|adım adım/i

/* ── Camera / QR scanner ───────────────────────────────── */
function CameraScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream: MediaStream | undefined
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        setError('Kamera açılamadı. Tarayıcı ayarlarından izin verip tekrar dene.')
      }
    })()
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/80 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111614] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-medium text-white">QR kodu tara</h2>
            <p className="mt-0.5 text-xs text-white/40">Kamera izni gerekiyor.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
          {!error && (
            <div className="pointer-events-none absolute inset-10 rounded-lg border-2 border-[#c7f464]/80" />
          )}
          {error && (
            <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-white/35">
          <ScanLine className="size-3.5 text-[#c7f464]" />
          Kodu çerçevenin içine hizala
        </p>
      </div>
    </div>
  )
}

/* ── Sidebar ───────────────────────────────────────────── */
function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = [
    { icon: MessageCircle, label: 'Sohbetler', active: true },
    { icon: Home, label: 'Ev rehberi' },
    { icon: Check, label: 'Tamamlananlar' },
  ]

  return (
    <>
      {open && (
        <button
          onClick={onClose}
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          aria-label="Menüyü kapat"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/5 bg-[#0d1210] px-4 py-5 transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-[#c7f464] text-[#0a0e0d]">
              <Wrench className="size-4" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">
              fixbuddy
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        <button className="mt-6 flex items-center gap-2 rounded-lg bg-[#c7f464] px-3 py-2.5 text-sm font-semibold text-[#0a0e0d] transition hover:bg-[#d4ff78]">
          <Plus className="size-4" strokeWidth={2.5} />
          Yeni soru
        </button>

        <nav className="mt-6 flex flex-col gap-0.5">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
            Menü
          </p>
          {nav.map(({ icon: Icon, label, active }) => (
            <a
              key={label}
              href="#"
              className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] transition ${
                active
                  ? 'bg-white/[0.06] text-white'
                  : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
              }`}
            >
              <Icon className={`size-4 ${active ? 'text-[#c7f464]' : ''}`} />
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#c7f464]">
            <ShieldCheck className="size-3.5" />
            Güvenli yardım
          </div>
          <p className="text-[11px] leading-5 text-white/40">
            Elektrik ve gaz işlerinde mutlaka bir uzmana danış.
          </p>
        </div>
      </aside>
    </>
  )
}

/* ── Message bubble ────────────────────────────────────── */
function ChatMessage({
  message,
  onScan,
}: {
  message: Message
  onScan: () => void
}) {
  const mine = message.role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-[slide_240ms_ease-out]`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
          mine
            ? 'rounded-br-md bg-[#c7f464] text-[#0a0e0d]'
            : 'rounded-bl-md border border-white/5 bg-[#141a17] text-white/80'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {message.solved && message.qr && (
          <div className="mt-4 border-t border-white/10 pt-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#c7f464]">
              <QrCode className="size-3.5" />
              Çözüm kaydedildi
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-white/40">
              Bu kodla çözüme daha sonra hızlıca ulaşabilirsin.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-lg bg-[#c7f464] p-1.5">
                <img src={message.qr} alt="Çözüm QR" className="size-28" />
              </div>
              <button
                onClick={onScan}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                <Camera className="size-3.5" /> QR okut
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────── */
export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  // scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function submitQuestion() {
    const question = input.trim()
    if (!question || loading) return
    setInput('')
    setMessages((c) => [...c, { id: crypto.randomUUID(), role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      })
      const text = (await res.text()) || 'Şu an yanıt veremiyorum. Lütfen tekrar dene.'
      const solved = solvedPattern.test(text)
      const qr = solved
        ? await QRCode.toDataURL(
            `fixbuddy://solution?q=${encodeURIComponent(question)}&a=${encodeURIComponent(text)}`,
            { margin: 1, width: 240, color: { dark: '#0a0e0d', light: '#c7f464' } }
          )
        : undefined
      setMessages((c) => [
        ...c,
        { id: crypto.randomUUID(), role: 'assistant', content: text, solved, qr },
      ])
    } catch {
      setMessages((c) => [
        ...c,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Bağlantıda bir sorun oldu. Lütfen tekrar dene.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <main className="min-h-screen bg-[#0a0e0d] text-[#e8efe9] antialiased selection:bg-[#c7f464] selection:text-[#0a0e0d]">
      {cameraOpen && <CameraScanner onClose={() => setCameraOpen(false)} />}

      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <section className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-white/5 bg-[#0a0e0d]/80 px-4 backdrop-blur-md sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/5 hover:text-white lg:hidden"
              aria-label="Menü"
            >
              <Menu className="size-5" />
            </button>
            <span className="hidden text-xs text-white/30 lg:block">
              Bugün neyi birlikte çözelim?
            </span>
            <div className="ml-auto flex items-center gap-2.5">
              <span className="hidden items-center gap-1.5 rounded-full border border-white/5 px-2.5 py-1 text-[11px] text-white/40 sm:flex">
                <span className="size-1.5 rounded-full bg-[#c7f464]" />
                AI hazır
              </span>
              <button className="grid size-8 place-items-center rounded-full bg-[#1e2a24] text-xs font-semibold text-[#c7f464]">
                AK
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
            <div ref={scrollRef} className="flex-1 overflow-y-auto py-10">
              {isEmpty ? (
                <div className="animate-[fade_400ms_ease-out]">
                  <div className="mb-6 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c7f464]">
                    <Sparkles className="size-3.5" />
                    Pratik yardımcın
                  </div>
                  <h1 className="max-w-xl text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[56px]">
                    Evinle ilgili her şey,
                    <br />
                    <span className="text-white/30">birlikte daha kolay.</span>
                  </h1>
                  <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/45">
                    Sorunu anlat, fotoğraf ekle ya da sesli sor. Sana adım adım, anlaşılır çözümler sunayım.
                  </p>

                  <div className="mt-10 grid gap-2.5 sm:grid-cols-3">
                    {STARTERS.map(({ icon: Icon, title, hint }) => (
                      <button
                        key={title}
                        onClick={() => {
                          setInput(title)
                          textareaRef.current?.focus()
                        }}
                        className="group flex flex-col items-start gap-4 rounded-xl border border-white/5 bg-white/[0.015] p-4 text-left transition hover:border-[#c7f464]/25 hover:bg-white/[0.03]"
                      >
                        <div className="grid size-8 place-items-center rounded-lg bg-white/[0.04] text-[#c7f464] transition group-hover:bg-[#c7f464]/10">
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <p className="text-[13.5px] font-medium text-white/85 group-hover:text-white">
                            {title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-white/30">{hint}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((m) => (
                    <ChatMessage
                      key={m.id}
                      message={m}
                      onScan={() => setCameraOpen(true)}
                    />
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 text-xs text-white/35">
                      <span className="flex gap-1">
                        <span className="size-1.5 animate-bounce rounded-full bg-[#c7f464] [animation-delay:-0.3s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-[#c7f464] [animation-delay:-0.15s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-[#c7f464]" />
                      </span>
                      fixbuddy düşünüyor…
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="sticky bottom-0 bg-gradient-to-t from-[#0a0e0d] via-[#0a0e0d] to-transparent pb-4 pt-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submitQuestion()
                }}
                className="rounded-2xl border border-white/10 bg-[#101614] p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition focus-within:border-[#c7f464]/40"
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing &&
                      (e as any).keyCode !== 229
                    ) {
                      e.preventDefault()
                      submitQuestion()
                    }
                  }}
                  placeholder="Bir tamir sorusu yaz…"
                  rows={1}
                  className="max-h-40 w-full resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
                  aria-label="Tamir sorunuz"
                />
                <div className="flex items-center justify-between px-1 pt-0.5">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setCameraOpen(true)}
                      className="rounded-lg p-2 text-white/35 transition hover:bg-white/5 hover:text-white/80"
                      aria-label="Kamera"
                    >
                      <Camera className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-white/35 transition hover:bg-white/5 hover:text-white/80"
                      aria-label="Sesli soru"
                    >
                      <Mic className="size-4" />
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="grid size-8 place-items-center rounded-lg bg-[#c7f464] text-[#0a0e0d] transition hover:bg-[#d4ff78] disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Gönder"
                  >
                    <ArrowUp className="size-4" strokeWidth={2.5} />
                  </button>
                </div>
              </form>
              <p className="mt-2 text-center text-[10.5px] text-white/20">
                Yanıtlar öneri niteliğindedir · Önemli işlerde uzman çağırınız.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
