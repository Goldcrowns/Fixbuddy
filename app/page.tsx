'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  ArrowUp, Camera, Check, Copy, MessageSquare, Mic, MicOff,
  Plus, RotateCcw, Trash2, X,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────── */
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  solved?: boolean
  qr?: string
  error?: boolean
}

type Conversation = {
  id: string
  title: string
  messages: Message[]
  updatedAt: number
}

const STARTERS = [
  'Musluk su kaçırıyor',
  'Duvarı nasıl delerim?',
  'Çamaşır makinesi çalışmıyor',
]

const solvedPattern =
  /çözüm|sorun.*(çözüld|gider)|tamamlandı|düzeldi|başarılı|uygula|adım adım/i

const STORAGE_KEY = 'fixbuddy.conversations.v1'
const uid = () => crypto.randomUUID()

/* ── Storage ───────────────────────────────────────────── */
function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Conversation[]) : []
  } catch {
    return []
  }
}

function saveConversations(list: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {}
}

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
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
      window.removeEventListener('keydown', onEsc)
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QR tarayıcı"
      className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-6"
      onClick={onClose}
    >
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-neutral-300">QR kodu tara</p>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:text-neutral-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e]"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="relative aspect-square overflow-hidden bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
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

/* ── Copy button ───────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {}
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] text-neutral-600 transition hover:text-neutral-300 focus:outline-none focus-visible:text-[#d4ff5e]"
      aria-label="Kopyala"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'kopyalandı' : 'kopyala'}
    </button>
  )
}

/* ── Sidebar (conversations) ───────────────────────────── */
function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose,
}: {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onClose?: () => void
}) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-neutral-900 bg-[#0a0a0a]">
      <div className="flex h-16 items-center justify-between px-4">
        <span className="text-sm font-medium tracking-tight text-neutral-100">fixbuddy</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-neutral-600 hover:text-neutral-300 md:hidden"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="px-2">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 border border-neutral-900 px-3 py-2 text-xs text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e]"
        >
          <Plus className="size-3.5" />
          Yeni sohbet
          <kbd className="ml-auto text-[10px] text-neutral-700">⌘K</kbd>
        </button>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-2 pb-4" aria-label="Sohbetler">
        {conversations.length === 0 ? (
          <p className="px-3 pt-2 text-[11px] text-neutral-700">Henüz sohbet yok</p>
        ) : (
          <ul className="space-y-0.5">
            {conversations
              .slice()
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((c) => {
                const active = c.id === activeId
                return (
                  <li key={c.id} className="group relative">
                    <button
                      onClick={() => onSelect(c.id)}
                      className={`flex w-full items-center gap-2 truncate px-3 py-2 pr-8 text-left text-xs transition focus:outline-none ${
                        active
                          ? 'text-neutral-100'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      <MessageSquare className="size-3.5 shrink-0" />
                      <span className="truncate">{c.title || 'Sohbet'}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(c.id)
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-neutral-700 opacity-0 transition group-hover:opacity-100 hover:text-red-400 focus:opacity-100"
                      aria-label="Sohbeti sil"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                )
              })}
          </ul>
        )}
      </nav>

      <div className="border-t border-neutral-900 p-4">
        <p className="text-[10.5px] leading-4 text-neutral-700">
          Öneri niteliğindedir. Elektrik ve gaz işlerinde uzman çağır.
        </p>
      </div>
    </aside>
  )
}

/* ── Message row ───────────────────────────────────────── */
function MessageRow({
  message,
  onRetry,
  onScan,
}: {
  message: Message
  onRetry: () => void
  onScan: () => void
}) {
  const mine = message.role === 'user'
  return (
    <div className="group">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-wider text-neutral-600">
          {mine ? 'Sen' : 'fixbuddy'}
        </span>
        {!mine && !message.error && message.content && (
          <span className="opacity-0 transition group-hover:opacity-100">
            <CopyButton text={message.content} />
          </span>
        )}
      </div>

      <p
        className={`whitespace-pre-wrap text-[15px] leading-relaxed ${
          message.error ? 'text-red-300' : 'text-neutral-200'
        }`}
      >
        {message.content}
      </p>

      {message.error && (
        <button
          onClick={onRetry}
          className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400 transition hover:text-neutral-100 focus:outline-none focus-visible:text-[#d4ff5e]"
        >
          <RotateCcw className="size-3" /> Tekrar dene
        </button>
      )}

      {message.solved && message.qr && (
        <div className="mt-5 flex items-center gap-4 border-t border-neutral-900 pt-4">
          <div className="bg-[#d4ff5e] p-1.5">
            <img src={message.qr} alt="Çözüm QR" className="size-24" />
          </div>
          <div>
            <p className="text-xs text-neutral-400">Çözüm kaydedildi</p>
            <button
              onClick={onScan}
              className="mt-1 text-xs text-[#d4ff5e] hover:underline focus:outline-none focus-visible:underline"
            >
              QR okut →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main ──────────────────────────────────────────────── */
export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recogRef = useRef<any>(null)

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  )
  const messages = active?.messages ?? []
  const isEmpty = messages.length === 0

  /* persistence */
  useEffect(() => {
    const list = loadConversations()
    setConversations(list)
    if (list.length) setActiveId(list[0].id)
  }, [])
  useEffect(() => {
    if (conversations.length) saveConversations(conversations)
  }, [conversations])

  /* textarea auto-grow */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  /* scroll on new message */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages.length, loading])

  /* new conversation */
  const newConversation = useCallback(() => {
    const c: Conversation = { id: uid(), title: '', messages: [], updatedAt: Date.now() }
    setConversations((prev) => [c, ...prev])
    setActiveId(c.id)
    setSidebarOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  /* delete */
  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        newConversation()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newConversation])

  /* update a message inside active conversation */
  const patchActive = (fn: (c: Conversation) => Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? fn(c) : c))
    )
  }

  /* send */
  async function send(questionOverride?: string) {
    const question = (questionOverride ?? input).trim()
    if (!question || loading) return

    // ensure a conversation exists
    let convId = activeId
    if (!convId) {
      const c: Conversation = {
        id: uid(),
        title: question.slice(0, 40),
        messages: [],
        updatedAt: Date.now(),
      }
      setConversations((prev) => [c, ...prev])
      setActiveId(c.id)
      convId = c.id
    }

    setInput('')
    const userMsg: Message = { id: uid(), role: 'user', content: question }
    const assistantId = uid()

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              title: c.title || question.slice(0, 40),
              messages: [
                ...c.messages,
                userMsg,
                { id: assistantId, role: 'assistant', content: '' },
              ],
              updatedAt: Date.now(),
            }
          : c
      )
    )
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

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: text, solved, qr } : m
                ),
              }
            : c
        )
      )
    } catch {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: 'Bağlantıda bir sorun oldu.',
                        error: true,
                      }
                    : m
                ),
              }
            : c
        )
      )
    } finally {
      setLoading(false)
    }
  }

  /* retry a failed assistant message */
  const retry = (assistantMsg: Message) => {
    const idx = messages.findIndex((m) => m.id === assistantMsg.id)
    const prevUser = messages
      .slice(0, idx)
      .reverse()
      .find((m) => m.role === 'user')
    if (!prevUser) return
    // remove the failed assistant + resend
    patchActive((c) => ({
      ...c,
      messages: c.messages.filter((m) => m.id !== assistantMsg.id),
    }))
    send(prevUser.content)
  }

  /* voice */
  const toggleVoice = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      alert('Tarayıcın sesli girişi desteklemiyor.')
      return
    }
    if (listening) {
      recogRef.current?.stop()
      setListening(false)
      return
    }
    const rec = new SR()
    rec.lang = 'tr-TR'
    rec.interimResults = false
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      setInput((prev) => (prev ? prev + ' ' + text : text))
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recogRef.current = rec
    rec.start()
    setListening(true)
  }

  /* empty-state starter send */
  const onStarter = (q: string) => {
    send(q)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-200 antialiased selection:bg-[#d4ff5e] selection:text-[#0a0a0a]">
      {cameraOpen && <CameraScanner onClose={() => setCameraOpen(false)} />}

      <div className="mx-auto flex min-h-screen w-full max-w-6xl">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar
            conversations={conversations}
            activeId={activeId}
            onSelect={(id) => {
              setActiveId(id)
              setInput('')
            }}
            onNew={newConversation}
            onDelete={deleteConversation}
          />
        </div>
        
        {/* Mobile drawer */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/60 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-40 md:hidden">
              <Sidebar
                conversations={conversations}
                activeId={activeId}
                onSelect={(id) => {
                  setActiveId(id)
                  setSidebarOpen(false)
                }}
                onNew={newConversation}
                onDelete={deleteConversation}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </>
        )}

        {/* Main column */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-900 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-xs text-neutral-500 hover:text-neutral-200 md:hidden"
              aria-label="Sohbetler"
            >
              sohbetler
            </button>
            <span className="hidden truncate text-xs text-neutral-600 md:block">
              {active?.title || 'yeni sohbet'}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCameraOpen(true)}
                className="text-neutral-600 hover:text-neutral-200 focus:outline-none focus-visible:text-[#d4ff5e]"
                aria-label="QR tara"
              >
                <Camera className="size-4" />
              </button>
              <button
                onClick={newConversation}
                className="text-neutral-600 hover:text-neutral-200 focus:outline-none focus-visible:text-[#d4ff5e]"
                aria-label="Yeni sohbet"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-2xl px-6 py-12">
              {isEmpty ? (
                <div>
                  <h1 className="text-3xl font-light leading-tight tracking-tight text-neutral-100 sm:text-4xl">
                    Neyi çözelim?
                  </h1>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">
                    Sorunu yaz, fotoğraf ekle veya sesli sor. Adım adım anlatayım.
                  </p>

                  <div className="mt-14 flex flex-col">
                    {STARTERS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => onStarter(prompt)}
                        className="group flex items-center justify-between border-t border-neutral-900 py-4 text-left text-sm text-neutral-400 transition hover:text-neutral-100 focus:outline-none focus-visible:text-[#d4ff5e]"
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
                    <MessageRow
                      key={m.id}
                      message={m}
                      onRetry={() => retry(m)}
                      onScan={() => setCameraOpen(true)}
                    />
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
          </div>

          {/* Composer */}
          <div className="sticky bottom-0 bg-[#0a0a0a]">
            <div className="mx-auto w-full max-w-2xl px-6 pb-5 pt-3">
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  send()
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
                      send()
                    }
                  }}
                  placeholder="Sorunu yaz…"
                  rows={1}
                  className="max-h-40 w-full resize-none bg-transparent py-1 text-[15px] text-neutral-100 outline-none placeholder:text-neutral-700"
                  aria-label="Tamir sorunuz"
                />
                <div className="mb-1 flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`grid size-7 place-items-center transition focus:outline-none ${
                      listening
                        ? 'text-[#d4ff5e]'
                        : 'text-neutral-600 hover:text-neutral-300'
                    }`}
                    aria-label={listening ? 'Dinlemeyi durdur' : 'Sesli sor'}
                  >
                    {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="grid size-7 place-items-center text-neutral-500 transition hover:text-[#d4ff5e] disabled:opacity-30 focus:outline-none focus-visible:text-[#d4ff5e]"
                    aria-label="Gönder"
                  >
                    <ArrowUp className="size-4" strokeWidth={2.5} />
                  </button>
                </div>
              </form>
              <p className="mt-2 text-[10.5px] text-neutral-700">
                Öneri niteliğindedir · Önemli işlerde uzman çağırın.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
