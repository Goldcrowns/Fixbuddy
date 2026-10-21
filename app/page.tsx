'use client'

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import QRCode from 'qrcode'
import {
  ArrowUp,
  Camera,
  Check,
  Copy,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────── */
type Role = 'user' | 'assistant'

type Message = {
  id: string
  role: Role
  content: string
  streaming?: boolean
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
] as const

const STORAGE_KEY = 'fixbuddy.conversations.v1'
const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

/* ─────────────────────────────────────────────────────────
   Storage helpers
   ───────────────────────────────────────────────────────── */
function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Conversation[]
    // streaming bayrağını temizle (sayfa yenilendiyse yarım kalmış olabilir)
    return parsed.map((c) => ({
      ...c,
      messages: c.messages.map((m) => ({ ...m, streaming: false })),
    }))
  } catch {
    return []
  }
}

function saveConversations(list: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* kota dolmuş olabilir, sessiz geç */
  }
}

/* ─────────────────────────────────────────────────────────
   Camera / QR scanner modal
   ───────────────────────────────────────────────────────── */
function CameraScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream: MediaStream | undefined
    let cancelled = false

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
        if (!cancelled && videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch {
        if (!cancelled) setError('Kamera açılamadı. İzin verip tekrar dene.')
      }
    })()

    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)

    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
      window.removeEventListener('keydown', onEsc)
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QR tarayıcı"
      className="fixed inset-0 z-50 grid place-items-center bg-black/95 p-6 backdrop-blur-sm"
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
            className="rounded p-1.5 text-neutral-500 transition hover:bg-neutral-900 hover:text-neutral-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e]"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative aspect-square overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="size-full object-cover"
          />
          {!error && (
            <>
              <div className="pointer-events-none absolute inset-12 rounded border-2 border-[#d4ff5e]/80" />
              <div className="pointer-events-none absolute inset-x-12 top-12 h-0.5 animate-pulse bg-[#d4ff5e]" />
            </>
          )}
          {error && (
            <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-neutral-400">
              {error}
            </p>
          )}
        </div>
        <p className="mt-3 text-center text-[11px] text-neutral-600">
          Kare içine QR kodu hizala
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Copy button
   ───────────────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* sessiz */
    }
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-neutral-600 transition hover:bg-neutral-900 hover:text-neutral-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e]"
      aria-label={copied ? 'Kopyalandı' : 'Kopyala'}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'kopyalandı' : 'kopyala'}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────
   Typing indicator
   ───────────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Yanıt hazırlanıyor">
      <span className="size-1.5 animate-bounce rounded-full bg-neutral-600 [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-neutral-600 [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-neutral-600" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Sidebar
   ───────────────────────────────────────────────────────── */
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
  const sorted = useMemo(
    () => conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  )

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-neutral-900 bg-[#0a0a0a]">
      <div className="flex h-16 items-center justify-between px-4">
        <span className="text-sm font-medium tracking-tight text-neutral-100">
          fixbuddy
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-600 transition hover:text-neutral-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e] md:hidden"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="px-2">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded border border-neutral-900 px-3 py-2 text-xs text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e]"
        >
          <Plus className="size-3.5" />
          Yeni sohbet
          <kbd className="ml-auto rounded border border-neutral-800 px-1 text-[10px] text-neutral-700">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav
        className="mt-4 flex-1 overflow-y-auto px-2 pb-4"
        aria-label="Sohbetler"
      >
        {sorted.length === 0 ? (
          <p className="px-3 pt-2 text-[11px] text-neutral-700">Henüz sohbet yok</p>
        ) : (
          <ul className="space-y-0.5">
            {sorted.map((c) => {
              const active = c.id === activeId
              return (
                <li key={c.id} className="group relative">
                  <button
                    onClick={() => onSelect(c.id)}
                    className={`flex w-full items-center gap-2 truncate rounded px-3 py-2 pr-8 text-left text-xs transition focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e] ${
                      active
                        ? 'bg-neutral-900 text-neutral-100'
                        : 'text-neutral-500 hover:bg-neutral-900/50 hover:text-neutral-300'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <MessageSquare className="size-3.5 shrink-0" />
                    <span className="truncate">{c.title || 'Sohbet'}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(c.id)
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-neutral-700 opacity-0 transition hover:bg-neutral-800 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
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

/* ─────────────────────────────────────────────────────────
   Message row
   ───────────────────────────────────────────────────────── */
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
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-600">
          {mine ? 'Sen' : 'fixbuddy'}
        </span>
        {!mine && !message.error && message.content && !message.streaming && (
          <span className="opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <CopyButton text={message.content} />
          </span>
        )}
        {message.streaming && (
          <Loader2 className="size-3 animate-spin text-neutral-700" aria-label="Yanıt akıyor" />
        )}
      </div>

      {message.streaming && !message.content ? (
        <TypingDots />
      ) : (
        <p
          className={`whitespace-pre-wrap text-[15px] leading-relaxed ${
            message.error ? 'text-red-300' : 'text-neutral-200'
          }`}
        >
          {message.content}
          {message.streaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#d4ff5e] align-text-bottom" />
          )}
        </p>
      )}

      {message.error && (
        <button
          onClick={onRetry}
          className="mt-2 flex items-center gap-1.5 rounded text-xs text-neutral-400 transition hover:text-neutral-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e]"
        >
          <RotateCcw className="size-3" /> Tekrar dene
        </button>
      )}

      {message.solved && message.qr && (
        <div className="mt-5 flex items-center gap-4 border-t border-neutral-900 pt-4">
          <div className="rounded bg-[#d4ff5e] p-1.5">
            <img src={message.qr} alt="Çözüm QR" className="size-24" />
          </div>
          <div>
            <p className="text-xs text-neutral-400">Çözüm kaydedildi</p>
            <button
              onClick={onScan}
              className="mt-1 rounded text-xs text-[#d4ff5e] transition hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e]"
            >
              QR okut →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Main page
   ───────────────────────────────────────────────────────── */
export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recogRef = useRef<any>(null)

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  )
  const messages = active?.messages ?? []
  const isEmpty = messages.length === 0

  /* ── hydration (persistence) ── */
  useEffect(() => {
    const list = loadConversations()
    setConversations(list)
    if (list.length) setActiveId(list[0].id)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && conversations.length) saveConversations(conversations)
  }, [conversations, hydrated])

  /* ── textarea auto-grow ── */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  /* ── scroll on new message ── */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages.length, loading])

  /* ── new conversation ── */
  const newConversation = useCallback(() => {
    const c: Conversation = {
      id: uid(),
      title: '',
      messages: [],
      updatedAt: Date.now(),
    }
    setConversations((prev) => [c, ...prev])
    setActiveId(c.id)
    setSidebarOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  /* ── delete ── */
  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeId === id) {
        setActiveId((prev) => {
          if (prev !== id) return prev
          const rest = conversations.filter((c) => c.id !== id)
          return rest[0]?.id ?? null
        })
      }
    },
    [activeId, conversations]
  )

  /* ── shortcuts ── */
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

  /* ── patch active conversation ── */
  const patchActive = useCallback(
    (fn: (c: Conversation) => Conversation) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? fn(c) : c))
      )
    },
    [activeId]
  )

  /* ── send ── */
  const send = useCallback(
    async (questionOverride?: string) => {
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
                  {
                    id: assistantId,
                    role: 'assistant',
                    content: '',
                    streaming: true,
                  },
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

        if (!res.ok || !res.body) throw new Error('Yanıt alınamadı')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let full = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          full += decoder.decode(value, { stream: true })

          // her chunk'ta UI'ı güncelle
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: full, streaming: true }
                        : m
                    ),
                  }
                : c
            )
          )
        }

        // akış bitti — solved tespiti + QR
        const solved = /çözüm|tamamlandı|düzeldi|başarılı|adım adım/i.test(full)
        let qr: string | undefined
        if (solved) {
          try {
            qr = await QRCode.toDataURL(
              `fixbuddy://solution?q=${encodeURIComponent(
                question
              )}&a=${encodeURIComponent(full)}`,
              {
                margin: 1,
                width: 240,
                color: { dark: '#0a0a0a', light: '#d4ff5e' },
              }
            )
          } catch {
            /* QR üretilemezse geç */
          }
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: full, streaming: false, solved, qr }
                      : m
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
                          content: 'Bağlantıda bir sorun oldu. Tekrar deneyebilirsin.',
                          streaming: false,
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
    },
    [activeId, input, loading]
  )
  /* ── retry ── */
  const retry = useCallback(
    (assistantMsg: Message) => {
      const idx = messages.findIndex((m) => m.id === assistantMsg.id)
      if (idx < 0) return
      const prevUser = messages
        .slice(0, idx)
        .reverse()
        .find((m) => m.role === 'user')
      if (!prevUser) return

      patchActive((c) => ({
        ...c,
        messages: c.messages.filter((m) => m.id !== assistantMsg.id),
      }))
      // kısa bekleme → durum güncellensin
      setTimeout(() => send(prevUser.content), 0)
    },
    [messages, patchActive, send]
  )

  /* ── voice ── */
  const toggleVoice = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
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
  }, [listening])

  /* ── submit ── */
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-[#0a0a0a] text-neutral-200 antialiased selection:bg-[#d4ff5e] selection:text-[#0a0a0a]">
      {cameraOpen && <CameraScanner onClose={() => setCameraOpen(false)} />}

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
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
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
            <div className="fixed inset-y-0 left-0 z-40 md:hidden">
              <Sidebar
                conversations={conversations}
                activeId={activeId}
                onSelect={(id) => {
                  setActiveId(id)
                  setSidebarOpen(false)
                  setInput('')
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
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-neutral-900 bg-[#0a0a0a]/90 px-4 backdrop-blur sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded text-xs text-neutral-500 transition hover:text-neutral-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e] md:hidden"
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
                className="rounded p-1 text-neutral-600 transition hover:text-neutral-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e]"
                aria-label="QR tara"
              >
                <Camera className="size-4" />
              </button>
              <button
                onClick={newConversation}
                className="rounded p-1 text-neutral-600 transition hover:text-neutral-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e]"
                aria-label="Yeni sohbet"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-12">
              {isEmpty ? (
                <div>
                  <h1 className="text-3xl font-light leading-tight tracking-tight text-neutral-100 sm:text-4xl">
                    Neyi çözelim?
                  </h1>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">
                    Sorunu yaz, fotoğraf ekle veya sesli sor. Adım adım anlatayım.
                  </p>

                  <div className="mt-12 flex flex-col">
                    {STARTERS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => send(prompt)}
                        className="group flex items-center justify-between border-t border-neutral-900 py-4 text-left text-sm text-neutral-400 transition hover:text-neutral-100 focus:outline-none focus-visible:text-[#d4ff5e]"
                      >
                        <span>{prompt}</span>
                        <span className="text-xs text-neutral-700 transition group-hover:translate-x-0.5 group-hover:text-[#d4ff5e]">
                          →
                        </span>
                      </button>
                    ))}
                    <div className="border-t border-neutral-900" />
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col gap-10"
                  aria-live="polite"
                  aria-busy={loading}
                >
                  {messages.map((m) => (
                    <MessageRow
                      key={m.id}
                      message={m}
                      onRetry={() => retry(m)}
                      onScan={() => setCameraOpen(true)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="sticky bottom-0 border-t border-neutral-900 bg-[#0a0a0a]/95 backdrop-blur">
            <form
              onSubmit={onSubmit}
              className="mx-auto w-full max-w-2xl px-5 py-4 sm:px-6"
            >
              <div className="flex items-end gap-2 rounded-lg border border-neutral-900 bg-neutral-950 px-3 py-2 transition focus-within:border-neutral-700">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder="Sorunu yaz…"
                  className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                  aria-label="Mesajını yaz"
                  disabled={loading}
                />

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`rounded p-1.5 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff5e] ${
                      listening
                        ? 'text-[#d4ff5e]'
                        : 'text-neutral-600 hover:text-neutral-300'
                    }`}
                    aria-label={listening ? 'Sesi durdur' : 'Sesli sor'}
                    aria-pressed={listening}
                  >
                    {listening ? (
                      <MicOff className="size-4" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="grid size-8 place-items-center rounded bg-[#d4ff5e] text-[#0a0a0a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4ff5e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
                    aria-label="Gönder"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-center text-[10.5px] text-neutral-700">
                Enter ile gönder · Shift+Enter ile yeni satır
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
                  }
  
