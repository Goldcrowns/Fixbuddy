'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowUp, X } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  solved?: boolean
  qr?: string
}

const STARTERS = [
  'Musluk su kaçırıyor',
  'Duvarı nasıl delerim?',
  'Çamaşır makinesi çalışmıyor',
]

const solvedPattern =
  /çözüm|sorun.*(çözüld|gider)|tamamlandı|düzeldi|başarılı|uygula|adım adım/i

/* ── QR modal ──────────────────────────────────────────── */
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
        setError('Kamera açılamadı. İzin verip tekrar dene.')
      }
    })()
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-neutral-300">QR kodu tara</p>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-200"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="relative aspect-square overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="size-full object-cover"
          />
          {!error && (
            <div className="pointer-events-none absolute inset-12 border border-[#d4ff5e]" />
          )}
          {error && (
            <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-neutral-400">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main ──────────────────────────────────────────────── */
export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, loading])

  async function submitQuestion() {
    const question = input.trim()
    if (!question || loading) return
    setInput('')
    setMessages((c) => [
      ...c,
      { id: crypto.randomUUID(), role: 'user', content: question },
    ])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      })
      const text = (await res.text()) || 'Şu an yanıt veremiyorum.'
      const solved = solvedPattern.test(text)
      const qr = solved
        ? await QRCode.toDataURL(
            `fixbuddy://solution?q=${encodeURIComponent(question)}&a=${encodeURIComponent(text)}`,
            { margin: 1, width: 240, color: { dark: '#0a0a0a', light: '#d4ff5e' } }
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
          content: 'Bağlantıda bir sorun oldu.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-200 antialiased selection:bg-[#d4ff5e] selection:text-[#0a0a0a]">
      {cameraOpen && <CameraScanner onClose={() => setCameraOpen(false)} />}

      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-900">
          <span className="text-sm font-medium tracking-tight text-neutral-100">
            fixbuddy
          </span>
          <span className="text-xs text-neutral-600">
            {isEmpty ? 'yeni sohbet' : `${messages.length} mesaj`}
          </span>
        </header>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-16">
          {isEmpty ? (
            <div>
              <h1 className="text-3xl font-light leading-tight tracking-tight text-neutral-100 sm:text-4xl">
                Neyi çözelim?
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">
                Sorunu yaz. Adım adım anlatayım.
              </p>

              <div className="mt-16 flex flex-col">
                {STARTERS.map((prompt, i) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt)
                      textareaRef.current?.focus()
                    }}
                    className="group flex items-center justify-between border-t border-neutral-900 py-4 text-left text-sm text-neutral-400 transition hover:text-neutral-100"
                  >
                    <span>{prompt}</span>
                    <span className="text-xs text-neutral-700 transition group-hover:text-[#d4ff5e]">
                      →
                    </span>
                  </button>
                ))}
                <div className="border-t border-neutral-900" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {messages.map((m) => (
                <div key={m.id}>
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-neutral-600">
                    {m.role === 'user' ? 'Sen' : 'fixbuddy'}
                  </p>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-200">
                    {m.content}
                  </p>

                  {m.solved && m.qr && (
                    <div className="mt-5 flex items-center gap-4 border-t border-neutral-900 pt-4">
                      <div className="bg-[#d4ff5e] p-1.5">
                        <img src={m.qr} alt="QR" className="size-24" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400">
                          Çözüm kaydedildi
                        </p>
                        <button
                          onClick={() => setCameraOpen(true)}
                          className="mt-1 text-xs text-[#d4ff5e] hover:underline"
                        >
                          QR okut →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-neutral-600">
                    fixbuddy
                  </p>
                  <p className="text-[15px] text-neutral-500">düşünüyor…</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="sticky bottom-0 bg-[#0a0a0a] pb-6 pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitQuestion()
            }}
            className="flex items-end gap-3 border-b border-neutral-800 pb-2 focus-within:border-neutral-600"
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
              placeholder="Sorunu yaz…"
              rows={1}
              className="max-h-40 w-full resize-none bg-transparent py-1 text-[15px] text-neutral-100 outline-none placeholder:text-neutral-700"
              aria-label="Tamir sorunuz"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="mb-1 grid size-7 shrink-0 place-items-center text-neutral-500 transition hover:text-[#d4ff5e] disabled:opacity-30"
              aria-label="Gönder"
            >
              <ArrowUp className="size-4" strokeWidth={2.5} />
            </button>
          </form>
          <p className="mt-3 text-[10.5px] text-neutral-700">
            Öneri niteliğindedir · Önemli işlerde uzman çağırınız.
          </p>
        </div>
      </div>
    </main>
  )
}
