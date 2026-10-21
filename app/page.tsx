'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  ArrowUp, Camera, Check, CheckCircle2, ChevronRight, Clock, Copy,
  Download, Flame, Home, Info, Lightbulb, Menu, Mic, Moon, MoreHorizontal,
  Plus, QrCode, ScanLine, Search, Send, Settings, Share2, ShieldCheck,
  Sparkles, Star, Sun, Trash2, Wrench, X, Zap,
} from 'lucide-react'

/* ── Types ── */
type Message = { id: string; role: 'user' | 'assistant'; content: string; ts: number; solved?: boolean; qr?: string }
type Category = { id: string; label: string; icon: any; count: number; color: string }

/* ── Data ── */
const STARTERS = [
  { icon: Wrench, title: 'Musluk su kaçırıyor', hint: 'Sıhhi tesisat' },
  { icon: Sparkles, title: 'Duvarı nasıl delerim?', hint: 'Matkap & dübel' },
  { icon: Home, title: 'Çamaşır makinesi çalışmıyor', hint: 'Beyaz eşya' },
  { icon: Zap, title: 'Priz cızırtı yapıyor', hint: 'Elektrik' },
]

const CATEGORIES: Category[] = [
  { id: 'all', label: 'Tümü', icon: Flame, count: 128, color: '#c7f464' },
  { id: 'tesisat', label: 'Tesisat', icon: Wrench, count: 42, color: '#7dd3fc' },
  { id: 'elektrik', label: 'Elektrik', icon: Zap, count: 31, color: '#fbbf24' },
  { id: 'beyaz-esya', label: 'Beyaz Eşya', icon: Home, count: 24, color: '#f472b6' },
  { id: 'genel', label: 'Genel', icon: Lightbulb, count: 31, color: '#a78bfa' },
]

const HISTORY = [
  { title: 'Musluk contası değişimi', cat: 'Tesisat', time: '2 dk önce', solved: true },
  { title: 'Matkap ucu seçimi', cat: 'Genel', time: '1 sa önce', solved: true },
  { title: 'Sigorta atıyor', cat: 'Elektrik', time: 'Dün', solved: false },
  { title: 'Çamaşır makinesi su almıyor', cat: 'Beyaz Eşya', time: '2 gün önce', solved: true },
]

/* ── Toast ── */
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
        <div key={t.id} className="rounded-lg border border-white/10 bg-[#101614] px-3.5 py-2 text-xs text-white/80 shadow-lg">
          {t.text}
        </div>
      ))}
    </div>
  )
  return { push, view }
}

/* ── QR Tarayıcı ── */
function CameraScanner({ onClose, onDetect }: { onClose: () => void; onDetect: (v: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream: MediaStream | undefined
    let raf = 0
    let detector: any

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        if ('BarcodeDetector' in window) {
          detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
          const tick = async () => {
            if (!videoRef.current || !detector) return
            try {
              const codes = await detector.detect(videoRef.current)
              if (codes?.length > 0) return onDetect(codes[0].rawValue || '')
            } catch {}
            raf = requestAnimationFrame(tick)
          }
          raf = requestAnimationFrame(tick)
        }
      } catch {
        setError('Kamera açılamadı. İzin verip tekrar dene.')
      }
    })()

    return () => {
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onDetect])

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/80 p-5" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111614] p-5" onClick={(e) => e.stopPropagation()}>
        <header className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium text-white"><QrCode className="size-4 text-[#c7f464]" /> QR kodu tara</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white"><X className="size-4" /></button>
        </header>
        <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
          {!error && (
            <div className="pointer-events-none absolute inset-10 rounded-lg border-2 border-[#c7f464]/80" />
          )}
          {error && <div className="absolute inset-0 grid place-items-center text-sm text-red-300">{error}</div>}
        </div>
      </div>
    </div>
  )
}

/* ── Sidebar ── */
function Sidebar({ open, onClose, onNewChat, onCategory, activeCategory }: any) {
  const [q, setQ] = useState('')
  const filtered = HISTORY.filter((h) => h.title.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      {open && <button onClick={onClose} className="fixed inset-0 z-20 bg-black/60 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-white/5 bg-[#0d1210] transition-transform duration-300 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 pb-4 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-lg bg-[#c7f464] text-[#0a0e0d]"><Wrench className="size-4" /></div>
            <span className="text-[15px] font-semibold text-white">fixbuddy</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 lg:hidden"><X className="size-4" /></button>
        </div>

        <div className="px-4">
          <button onClick={onNewChat} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#c7f464] py-2.5 text-sm font-semibold text-[#0a0e0d]">
            <Plus className="size-4" /> Yeni soru
          </button>
        </div>

        <div className="mt-3 px-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
            <Search className="size-3.5 text-white/30" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Geçmişte ara…" className="w-full bg-transparent text-xs text-white outline-none" />
          </div>
        </div>

        <div className="mt-5 px-4 space-y-0.5">
          {CATEGORIES.map(({ id, label, icon: Icon, color }) => (
            <button key={id} onClick={() => onCategory(id)} className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] ${activeCategory === id ? 'bg-white/[0.06] text-white' : 'text-white/50'}`}>
              <Icon className="size-3.5" style={{ color }} />
              <span className="flex-1 text-left">{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex-1 overflow-y-auto px-4 space-y-0.5">
          {filtered.map((h) => (
            <button key={h.title} className="flex w-full gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/[0.04]">
              <span className="text-[12.5px] text-white/80">{h.title}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}

/* ── Chat Mesajı ── */
function ChatMessage({ message, onScan }: { message: Message; onScan: () => void }) {
  const mine = message.role === 'user'
  const time = new Date(message.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
      <div className={`mt-1 grid size-7 place-items-center rounded-full ${mine ? 'bg-white/10 text-white' : 'bg-[#c7f464] text-black'}`}>
        {mine ? 'AK' : <Wrench className="size-3.5" />}
      </div>
      <div className={`flex max-w-[82%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 text-[13.5px] ${mine ? 'bg-[#c7f464] text-black' : 'bg-[#141a17] text-white/85'}`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
          
          {message.qr && (
            <div className="mt-4 border-t border-black/10 pt-3">
              <div className="flex items-center gap-3">
                <img src={message.qr} alt="QR" className="size-24 rounded bg-white p-1" />
                <button onClick={onScan} className="text-xs flex items-center gap-1 border border-black/20 px-2 py-1 rounded">
                  <Camera className="size-3" /> Tara
                </button>
              </div>
            </div>
          )}
        </div>
        <span className="mt-1 text-[10px] text-white/30">{time}</span>
      </div>
    </div>
  )
}

/* ── ANA SAYFA ── */
export default function FixBuddyApp() {
  const [sidebar, setSidebar] = useState(false)
  const [activeCat, setActiveCat] = useState('all')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [scanner, setScanner] = useState(false)
  const { push, view } = useToast()

  const send = () => {
    if (!input.trim()) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, ts: Date.now() }
    setMessages((p) => [...p, userMsg])
    setInput('')
    
    // Fake AI yanıtı (Test için)
    setTimeout(() => {
      setMessages((p) => [...p, { id: Date.now().toString(), role: 'assistant', content: 'Sorunuzu aldım, hemen çözüm arıyorum...', ts: Date.now() }])
    }, 1000)
  }

  return (
    <div className="flex h-screen bg-[#0a0e0d] text-white overflow-hidden font-sans">
      <Sidebar open={sidebar} onClose={() => setSidebar(false)} onNewChat={() => setMessages([])} onCategory={setActiveCat} activeCategory={activeCat} />
      
      <main className="flex flex-1 flex-col h-full relative">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <button onClick={() => setSidebar(true)} className="lg:hidden"><Menu className="size-5" /></button>
          <h1 className="text-sm font-medium">Yeni Sohbet</h1>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="size-12 bg-[#c7f464] rounded-xl grid place-items-center mb-4"><Wrench className="size-6 text-black" /></div>
              <h2 className="text-2xl font-semibold mb-2">Merhaba, size nasıl yardımcı olabilirim?</h2>
              <p className="text-white/40 text-sm mb-6">Tamir, tadilat veya genel sorunlarınız için buradayım.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {STARTERS.map((s, i) => (
                  <button key={i} onClick={() => setInput(s.title)} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-left text-sm">
                    <s.icon className="size-4 text-[#c7f464]" />
                    <div><p className="text-white">{s.title}</p><p className="text-[10px] text-white/40">{s.hint}</p></div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <ChatMessage key={m.id} message={m} onScan={() => setScanner(true)} />)
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/5 bg-[#0a0e0d]">
          <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-white/[0.03] border border-white/10 rounded-xl p-2 focus-within:border-[#c7f464]/50">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Sorunuzu yazın..."
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-sm p-2 max-h-32 text-white placeholder:text-white/20"
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button onClick={send} className="p-2 bg-[#c7f464] rounded-lg text-black disabled:opacity-50" disabled={!input.trim()}>
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
      </main>
      
      {scanner && <CameraScanner onClose={() => setScanner(false)} onDetect={(val) => { setScanner(false); push('QR okundu!'); }} />}
      {view}
    </div>
  )
}
