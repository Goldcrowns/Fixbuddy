'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  ArrowUp, Bookmark, Camera, Check, CheckCircle2, ChevronRight, Clock,
  Copy, Download, FileText, Flame, Home, Image as ImageIcon, Info,
  Lightbulb, Menu, MessageCircle, Mic, Moon, MoreHorizontal, Plus, QrCode,
  ScanLine, Search, Send, Settings, ShieldCheck, Share2, Sparkles, Star,
  Sun, ThumbsUp, Trash2, Wrench, X, Zap,
} from 'lucide-react'

/* ────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────── */
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
  solved?: boolean
  qr?: string
  category?: string
}

type Category = {
  id: string
  label: string
  icon: typeof Wrench
  count: number
  color: string
}

/* ────────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────────── */
const STARTERS = [
  { icon: Wrench, title: 'Musluk su kaçırıyor', hint: 'Sıhhi tesisat', cat: 'tesisat' },
  { icon: Sparkles, title: 'Duvarı nasıl delerim?', hint: 'Matkap & dübel', cat: 'genel' },
  { icon: Home, title: 'Çamaşır makinesi çalışmıyor', hint: 'Beyaz eşya', cat: 'beyaz-esya' },
  { icon: Zap, title: 'Priz cızırtı yapıyor', hint: 'Elektrik (dikkat!)', cat: 'elektrik' },
]

const CATEGORIES: Category[] = [
  { id: 'all', label: 'Tümü', icon: Flame, count: 128, color: '#c7f464' },
  { id: 'tesisat', label: 'Tesisat', icon: Wrench, count: 42, color: '#7dd3fc' },
  { id: 'elektrik', label: 'Elektrik', icon: Zap, count: 31, color: '#fbbf24' },
  { id: 'beyaz-esya', label: 'Beyaz Eşya', icon: Home, count: 24, color: '#f472b6' },
  { id: 'genel', label: 'Genel', icon: Lightbulb, count: 31, color: '#a78bfa' },
]

const POPULAR = [
  'Banyo gideri tıkalı, ne yapmalıyım?',
  'Buzdolabı soğutmuyor, kompresör mü bozuk?',
  'Lambayı değiştirdim ama yanmıyor, neden?',
  'Duvarda nem var, küf nasıl engellenir?',
]

const HISTORY = [
  { title: 'Musluk contası değişimi', cat: 'Tesisat', time: '2 dk önce', solved: true },
  { title: 'Matkap ucu seçimi', cat: 'Genel', time: '1 sa önce', solved: true },
  { title: 'Sigorta atıyor', cat: 'Elektrik', time: 'Dün', solved: false },
  { title: 'Çamaşır makinesi su almıyor', cat: 'Beyaz Eşya', time: '2 gün önce', solved: true },
]

const solvedPattern =
  /çözüm|sorun.*(çözüld|gider)|tamamlandı|düzeldi|başarılı|uygula|adım adım/i

/* ────────────────────────────────────────────────────────────
   Toast helper
   ──────────────────────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([])
  const push = useCallback((text: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400)
  }, [])
  const view = (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-[slide_240ms_ease-out] rounded-lg border border-white/10 bg-[#101614] px-3.5 py-2 text-xs text-white/80 shadow-lg backdrop-blur"
        >
          {t.text}
        </div>
      ))}
    </div>
  )
  return { push, view }
}

/* ────────────────────────────────────────────────────────────
   Camera / QR scanner
   ──────────────────────────────────────────────────────────── */
function CameraScanner({ onClose, onDetect }: { onClose: () => void; onDetect: (v: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    let stream: MediaStream | undefined
    let raf = 0
    let detector: any

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setScanning(true)

        // Use BarcodeDetector if available
        if ('BarcodeDetector' in window) {
          detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
          const tick = async () => {
            if (!videoRef.current || !detector) return
            try {
              const codes = await detector.detect(videoRef.current)
              if (codes && codes.length > 0) {
                onDetect(codes[0].rawValue || '')
                return
              }
            } catch {}
            raf = requestAnimationFrame(tick)
          }
          raf = requestAnimationFrame(tick)
        }
      } catch {
        setError('Kamera açılamadı. Tarayıcı ayarlarından izin verip tekrar dene.')
        setScanning(false)
      }
    })()

    return () => {
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onDetect])

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/80 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-[fade_200ms_ease-out] rounded-2xl border border-white/10 bg-[#111614] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium text-white">
              <QrCode className="size-4 text-[#c7f464]" />
              QR kodu tara
            </h2>
            <p className="mt-1 text-xs text-white/40">
              {scanning ? 'Kodu çerçeveye hizala…' : 'Kamera izni gerekiyor.'}
            </p>
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
            <>
              <div className="pointer-events-none absolute inset-10 rounded-lg border-2 border-[#c7f464]/80" />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 animate-[scan_2s_linear_infinite] bg-[#c7f464]/70" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40" />
            </>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                <Camera className="mx-auto mb-2 size-6 text-red-300/60" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <ScanLine className="size-3.5 text-[#c7f464]" />
            Otomatik algılama
          </span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px]">
            {scanning ? 'Taranıyor' : 'Bekliyor'}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Sidebar
   ──────────────────────────────────────────────────────────── */
function Sidebar({
  open,
  onClose,
  onNewChat,
  onCategory,
  activeCategory,
  history,
}: {
  open: boolean
  onClose: () => void
  onNewChat: () => void
  onCategory: (id: string) => void
  activeCategory: string
  history: typeof HISTORY
}) {
  const [q, setQ] = useState('')
  const filtered = history.filter((h) =>
    h.title.toLowerCase().includes(q.toLowerCase())
  )

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
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-white/5 bg-[#0d1210] transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 pb-4 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="relative grid size-9 place-items-center rounded-lg bg-[#c7f464] text-[#0a0e0d]">
              <Wrench className="size-4" strokeWidth={2.5} />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 border-[#0d1210] bg-[#c7f464]" />
            </div>
            <div>
              <span className="block text-[15px] font-semibold tracking-tight text-white">fixbuddy</span>
              <span className="block text-[10px] text-white/30">v2.0 · ev asistanı</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* New chat */}
        <div className="px-4">
          <button
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#c7f464] px-3 py-2.5 text-sm font-semibold text-[#0a0e0d] transition hover:bg-[#d4ff78] active:scale-[0.98]"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Yeni soru
            <kbd className="ml-auto rounded border border-[#0a0e0d]/20 bg-[#0a0e0d]/10 px-1.5 py-0.5 text-[10px] font-mono">
              N
            </kbd>
          </button>
        </div>

        {/* Search */}
        <div className="mt-3 px-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 focus-within:border-[#c7f464]/30">
            <Search className="size-3.5 text-white/30" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Geçmişte ara…"
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/25"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mt-5 px-4">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
            Kategoriler
          </p>
          <div className="flex flex-col gap-0.5">
            {CATEGORIES.map(({ id, label, icon: Icon, count, color }) => {
              const active = activeCategory === id
              return (
                <button
                  key={id}
                  onClick={() => onCategory(id)}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition ${
                    active
                      ? 'bg-white/[0.06] text-white'
                      : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
                  }`}
                >
                  <Icon className="size-3.5" style={{ color: active ? color : undefined }} />
                  <span className="flex-1 text-left">{label}</span>
                  <span className="text-[10px] text-white/30">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* History */}
        <div className="mt-5 flex min-h-0 flex-1 flex-col px-4">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
              Geçmiş
            </p>
            <button className="text-[10px] text-white/40 hover:text-white">Tümü</button>
          </div>
          <div className="-mx-1 flex-1 space-y-0.5 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="px-2 py-4 text-center text-[11px] text-white/25">Sonuç yok</p>
            )}
            {filtered.map((h) => (
              <button
                key={h.title}
                className="group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-white/[0.04]"
              >
                <div
                  className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded ${
                    h.solved ? 'bg-[#c7f464]/10 text-[#c7f464]' : 'bg-white/[0.04] text-white/40'
                  }`}
                >
                  {h.solved ? <Check className="size-3" /> : <Clock className="size-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] text-white/80 group-hover:text-white">{h.title}</p>
                  <p className="text-[10px] text-white/30">
                    {h.cat} · {h.time}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Safety card */}
        <div className="m-4 mt-2 rounded-xl border border-[#c7f464]/10 bg-[#c7f464]/[0.03] p-3.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#c7f464]">
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

/* ────────────────────────────────────────────────────────────
   Right info panel
   ──────────────────────────────────────────────────────────── */
function InfoPanel({ solvedCount, totalCount }: { solvedCount: number; totalCount: number }) {
  return (
    <aside className="hidden w-72 shrink-0 border-l border-white/5 bg-[#0b100e] px-4 py-5 xl:block">
      <div className="mb-4 flex items-center gap-2">
        <Info className="size-4 text-white/40" />
        <h3 className="text-sm font-medium text-white">Bu oturum</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/30">Soru</p>
          <p className="mt-1 text-lg font-semibold text-white">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/30">Çözüm</p>
          <p className="mt-1 text-lg font-semibold text-[#c7f464]">{solvedCount}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-white/60">
          <Zap className="size-3.5 text-[#c7f464]" />
          Hızlı ipuçları
        </div>
        <ul className="space-y-2 text-[11px] leading-5 text-white/40">
          <li className="flex gap-2">
            <span className="text-[#c7f464]">•</span>
            Sorunu fotoğrafla, daha net çözüm al.
          </li>
          <li className="flex gap-2">
            <span className="text-[#c7f464]">•</span>
            QR kod ile çözümü yanında taşı.
          </li>
          <li className="flex gap-2">
            <span className="text-[#c7f464]">•</span>
            Emin değilsen uzman çağır — güvenlik önce.
          </li>
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-gradient-to-br from-[#c7f464]/[0.06] to-transparent p-3.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#c7f464]">
          <Star className="size-3.5" />
          fixbuddy Pro
        </div>
        <p className="text-[11px] leading-5 text-white/40">
          Sınırsız çözüm, adım adım video rehberleri ve öncelikli yanıt.
        </p>
        <button className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-white/[0.06] py-1.5 text-[11px] text-white/80 hover:bg-white/[0.1]">
          Yükselt <ChevronRight className="size-3" />
        </button>
      </div>
    </aside>
  )
}
/* ────────────────────────────────────────────────────────────
   Message bubble
   ──────────────────────────────────────────────────────────── */
function ChatMessage({
  message,
  onScan,
  onCopy,
  onLike,
  onSave,
}: {
  message: Message
  onScan: () => void
  onCopy: (t: string) => void
  onLike: () => void
  onSave: () => void
}) {
  const mine = message.role === 'user'
  const time = new Date(message.ts).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  async function downloadQR() {
    if (!message.qr) return
    const a = document.createElement('a')
    a.href = message.qr
    a.download = 'fixbuddy-cozum.png'
    a.click()
  }

  return (
    <div
      className={`group flex gap-2.5 ${mine ? 'flex-row-reverse' : ''} animate-[slide_240ms_ease-out]`}
    >
      {/* avatar */}
      <div
        className={`mt-1 grid size-7 shrink-0 place-items-center rounded-full ${
          mine ? 'bg-white/[0.06] text-white/60' : 'bg-[#c7f464] text-[#0a0e0d]'
        }`}
      >
        {mine ? <span className="text-[10px] font-semibold">AK</span> : <Wrench className="size-3.5" />}
      </div>

      <div className={`flex max-w-[82%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
            mine
              ? 'rounded-br-md bg-[#c7f464] text-[#0a0e0d]'
              : 'rounded-bl-md border border-white/5 bg-[#141a17] text-white/85'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>

          {message.solved && message.qr && (
            <div className="mt-4 border-t border-white/10 pt-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#c7f464]">
                <CheckCircle2 className="size-3.5" />
                Çözüm kaydedildi
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-white/40">
                Bu kodla çözüme daha sonra hızlıca ulaşabilirsin.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="rounded-lg bg-[#c7f464] p-1.5">
                  <img src={message.qr} alt="Çözüm QR" className="size-28" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={onScan}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:bg-white/5 hover:text-white"
                  >
                    <Camera className="size-3.5" /> QR okut
                  </button>
                  <button
                    onClick={downloadQR}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:bg-white/5 hover:text-white"
                  >
                    <Download className="size-3.5" /> İndir
                  </button>
                  <button
                    onClick={() => navigator.share?.({ title: 'fixbuddy çözüm', url: message.qr }).catch(() => {})}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:bg-white/5 hover:text-white"
                  >
                    <Share2 className="size-3.5" /> Paylaş
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* meta / actions */}
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] text-white/30 ${
            mine ? 'flex-row-reverse' : ''
          }`}
        >
          <span>{time}</span>
          {!mine && (
            <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => onCopy(message.content)}
                className="rounded p-1 hover:bg-white/5 hover:text-white/70"
                aria-label="Kopyala"
              >
                <Copy className="size-3" />
              </button>
              <button
                onClick={onLike}
                className="rounded p-1 hover:bg-white/5 hover:text-white/70"
                aria-label="Beğen"
              >
                <ThumbsUp className="size-3" />
              </button>
              <button
                onClick={onSave}
                className="rounded p-1 hover:bg-white/5 hover:text-white/70"
                aria-label="Kaydet"
              >
                <Bookmark className="size-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Empty / hero state
   ──────────────────────────────────────────────────────────── */
function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="animate-[fade_400ms_ease-out]">
      <div className="mb-6 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c7f464]">
        <Sparkles className="size-3.5" />
        Pratik yardımcın
      </div>
      <h1 className="max-w-2xl text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[56px]">
        Evinle ilgili her şey,
        <br />
        <span className="bg-gradient-to-r from-[#c7f464] to-[#7dd3fc] bg-clip-text text-transparent">
          birlikte daha kolay.
        </span>
      </h1>
      <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/45">
        Sorunu anlat, fotoğraf ekle ya da sesli sor. Sana adım adım, anlaşılır çözümler sunayım.
      </p>

      {/* stats strip */}
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-white/35">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-[#c7f464]" /> 1.284 çözüm
        </span>
        <span className="flex items-center gap-1.5">
          <Flame className="size-3.5 text-[#fbbf24]" /> 98% memnuniyet
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-[#7dd3fc]" /> ~12 sn ortalama yanıt
        </span>
      </div>

      {/* starters */}
      <div className="mt-10 grid gap-2.5 sm:grid-cols-2">
        {STARTERS.map(({ icon: Icon, title, hint, cat }) => (
          <button
            key={title}
            onClick={() => onPick(title)}
            className="group flex items-start gap-3.5 rounded-xl border border-white/5 bg-white/[0.015] p-4 text-left transition hover:border-[#c7f464]/25 hover:bg-white/[0.03]"
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-[#c7f464] transition group-hover:bg-[#c7f464]/10">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-white/85 group-hover:text-white">{title}</p>
              <p className="mt-0.5 text-[11px] text-white/30">
                {hint} · <span className="text-[#c7f464]/60">{cat}</span>
              </p>
            </div>
            <ChevronRight className="mt-1 size-4 shrink-0 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
          </button>
        ))}
      </div>

      {/* popular */}
      <div className="mt-8">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
          Popüler sorular
        </p>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR.map((p) => (
            <button
              key={p}
              onClick={() => onPick(p)}
              className="rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11.5px] text-white/55 transition hover:border-[#c7f464]/30 hover:text-white"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [activeCategory, setActiveCategory] = useState('all')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { push, view } = useToast()

  const solvedCount = useMemo(() => messages.filter((m) => m.solved).length, [messages])
  const userCount = useMemo(() => messages.filter((m) => m.role === 'user').length, [messages])

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

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        textareaRef.current?.focus()
      }
      if (mod && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        newChat()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const newChat = () => {
    setMessages([])
    setSidebarOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  async function submitQuestion() {
    const question = input.trim()
    if (!question || loading) return
    setInput('')
    setMessages((c) => [
      ...c,
      { id: crypto.randomUUID(), role: 'user', content: question, ts: Date.now() },
    ])
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
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: text,
          ts: Date.now(),
          solved,
          qr,
        },
      ])
    } catch {
      setMessages((c) => [
        ...c,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Bağlantıda bir sorun oldu. Lütfen tekrar dene.',
          ts: Date.now(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0
  const bg = theme === 'dark' ? '#0a0e0d' : '#f6f8f4'
  const fg = theme === 'dark' ? '#e8efe9' : '#111614'

  return (
    <main
      className="min-h-screen antialiased transition-colors duration-300"
      style={{ backgroundColor: bg, color: fg }}
    >
      {cameraOpen && (
        <CameraScanner
          onClose={() => setCameraOpen(false)}
          onDetect={(v) => {
            setCameraOpen(false)
            push('QR algılandı: ' + v.slice(0, 30))
          }}
        />
      )}
      {view}

      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNewChat={newChat}
          onCategory={setActiveCategory}
          activeCategory={activeCategory}
          history={HISTORY}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-white/5 bg-[#0a0e0d]/80 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/5 hover:text-white lg:hidden"
                aria-label="Menü"
              >
                <Menu className="size-5" />
              </button>
              <div className="hidden items-center gap-1.5 text-xs text-white/30 lg:flex">
                <MessageCircle className="size-3.5" />
                <span>Sohbetler</span>
                <ChevronRight className="size-3" />
                <span className="text-white/60">
                  {isEmpty ? 'Yeni sohbet' : messages.find((m) => m.role === 'user')?.content.slice(0, 30) + '…'}
                </span>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-white/5 px-2.5 py-1 text-[11px] text-white/40 sm:flex">
                <span className="size-1.5 animate-pulse rounded-full bg-[#c7f464]" />
                AI hazır
              </span>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
                aria-label="Tema"
                  >
                {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <button className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white" aria-label="Ayarlar">
                <Settings className="size-4" />
              </button>
              <button className="grid size-8 place-items-center rounded-full bg-[#1e2a24] text-xs font-semibold text-[#c7f464]">
                AK
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
            <div ref={scrollRef} className="flex-1 overflow-y-auto py-10">
              {isEmpty ? (
                <EmptyState
                  onPick={(t) => {
                    setInput(t)
                    textareaRef.current?.focus()
                  }}
                />
              ) : (
                <div className="flex flex-col gap-5">
                  {messages.map((m) => (
                    <ChatMessage
                      key={m.id}
                      message={m}
                      onScan={() => setCameraOpen(true)}
                      onCopy={(t) => {
                        navigator.clipboard.writeText(t).then(() => push('Kopyalandı'))
                      }}
                      onLike={() => push('Geri bildirimin için teşekkürler')}
                      onSave={() => push('Çözüm kaydedildi')}
                    />
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-7 place-items-center rounded-full bg-[#c7f464] text-[#0a0e0d]">
                        <Wrench className="size-3.5" />
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/5 bg-[#141a17] px-4 py-3 text-xs text-white/40">
                        <span className="flex gap-1">
                          <span className="size-1.5 animate-bounce rounded-full bg-[#c7f464] [animation-delay:-0.3s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-[#c7f464] [animation-delay:-0.15s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-[#c7f464]" />
                        </span>
                        fixbuddy düşünüyor…
                      </div>
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
                  placeholder="Bir tamir sorusu yaz…  (⌘K ile odakla)"
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
                      title="QR tara / fotoğraf ekle"
                    >
                      <Camera className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-white/35 transition hover:bg-white/5 hover:text-white/80"
                      aria-label="Görsel ekle"
                      title="Görsel ekle"
                    >
                      <ImageIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-white/35 transition hover:bg-white/5 hover:text-white/80"
                      aria-label="Sesli soru"
                      title="Sesli sor"
                    >
                      <Mic className="size-4" />
                    </button>
                    <span className="ml-1 hidden items-center gap-1 text-[10px] text-white/25 sm:flex">
                      <span className="size-1 rounded-full bg-[#c7f464]" />
                      GPT-4o mini
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {input.length > 0 && (
                      <span className="text-[10px] text-white/30">{input.length}/2000</span>
                    )}
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="grid size-8 place-items-center rounded-lg bg-[#c7f464] text-[#0a0e0d] transition hover:bg-[#d4ff78] disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Gönder"
                    >
                      <ArrowUp className="size-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </form>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-white/20">
                <ShieldCheck className="size-3" />
                Yanıtlar öneri niteliğindedir · Önemli işlerde uzman çağırınız.
              </p>
            </div>
          </div>
        </section>

        <InfoPanel solvedCount={solvedCount} totalCount={userCount} />
      </div>

      {/* Global animations */}
      <style jsx global>{`
        @keyframes fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scan {
          0%   { top: 10%; }
          50%  { top: 90%; }
          100% { top: 10%; }
        }
      `}</style>
    </main>
  )
}
