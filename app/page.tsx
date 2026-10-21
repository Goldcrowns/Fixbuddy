'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowUp, Camera, CheckCircle2, Clock3, Hammer, Home, Lightbulb, Menu, MessageCircle, Mic, Plus, QrCode, ScanLine, ShieldCheck, Sparkles, Wrench, X } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string; solved?: boolean; qr?: string }

const starterPrompts = ['Musluk su kaçırıyor', 'Duvarı nasıl delerim?', 'Çamaşır makinesi çalışmıyor']

function looksSolved(text: string) {
  return /çözüm|sorun.*(çözüld|gider)|tamamlandı|düzeldi|başarılı|uygula|adım adım/i.test(text)
}

function CameraScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream: MediaStream | undefined
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        setError('Kameraya erişilemedi. Tarayıcı ayarlarından kamera iznini açıp tekrar deneyin.')
      }
    }
    startCamera()
    return () => stream?.getTracks().forEach((track) => track.stop())
  }, [])

  return <div className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-5"><div className="w-full max-w-md rounded-none border border-white/10 bg-[#18201d] p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold text-white">QR kodu tara</p><p className="mt-1 text-xs text-white/45">Önce kamera izni vermen gerekiyor.</p></div><button onClick={onClose} className="rounded-lg p-2 text-white/50 hover:bg-white/5" aria-label="Kamerayı kapat"><X className="size-5" /></button></div><div className="relative aspect-square overflow-hidden rounded-none bg-black"><video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" aria-label="QR tarama kamerası" />{!error && <div className="pointer-events-none absolute inset-10 rounded-none border-2 border-[#8ed8ff]" />} {error && <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-red-200">{error}</p>}</div><p className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40"><ScanLine className="size-4 text-[#8ed8ff]" />QR kodu çerçevenin içine hizala</p></div></div>
}

function QRGenerator({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState('')
  const [qr, setQr] = useState('')

  async function generateQR(event: FormEvent) {
    event.preventDefault()
    const text = value.trim()
    if (!text) return
    setQr(await QRCode.toDataURL(text, { margin: 2, width: 280, color: { dark: '#0b1720', light: '#8ed8ff' } }))
  }

  return <div className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-none border border-white/10 bg-[#141d1a]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,.45)] backdrop-blur-xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-white">QR kodu üret</p><p className="mt-1 text-xs text-white/45">Bir çözümü veya kısa notu QR koduna dönüştür.</p></div><button onClick={onClose} className="rounded-lg p-2 text-white/50 hover:bg-white/5" aria-label="QR üreticiyi kapat"><X className="size-5" /></button></div><form onSubmit={generateQR} className="flex flex-col gap-3"><label htmlFor="qr-content" className="text-xs font-medium text-white/60">QR içeriği</label><textarea id="qr-content" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Örn. Musluk contası değiştirme adımları" rows={3} className="resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#8ed8ff]/50" /><button type="submit" disabled={!value.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-[#8ed8ff] px-4 py-3 text-sm font-semibold text-[#0b1720] disabled:cursor-not-allowed disabled:opacity-40"><QrCode className="size-4" />QR kodu oluştur</button></form>{qr && <div className="mt-5 flex flex-col items-center gap-3 border-t border-white/10 pt-5"><img src={qr} alt="Oluşturulan QR kod" className="size-56 rounded-xl" /><a href={qr} download="fixbuddy-cozum-qr.png" className="text-xs font-medium text-[#8ed8ff] hover:underline">QR kodunu indir</a></div>}</div></div>
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [qrGeneratorOpen, setQrGeneratorOpen] = useState(false)

  async function submitQuestion(event?: FormEvent) {
    event?.preventDefault()
    const question = input.trim()
    if (!question || loading) return
    setInput('')
    setMessages((current) => [...current, { role: 'user', content: question }])
    setLoading(true)
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: question }) })
      const text = await response.text()
      const answer = text || 'Şu an yanıt veremiyorum. Lütfen tekrar dene.'
      const solved = looksSolved(answer)
      const qr = solved ? await QRCode.toDataURL(`fixbuddy://solution?question=${encodeURIComponent(question)}&answer=${encodeURIComponent(answer)}`, { margin: 2, width: 240, color: { dark: '#0b1720', light: '#8ed8ff' } }) : undefined
      setMessages((current) => [...current, { role: 'assistant', content: answer, solved, qr }])
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'Bağlantıda bir sorun oldu. Lütfen tekrar dene.' }])
    } finally { setLoading(false) }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b0f] text-[#edf3ef] selection:bg-[#8ed8ff] selection:text-[#182016]"><div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-[#8ed8ff]/[.07] blur-3xl" /><div className="pointer-events-none absolute -bottom-48 right-0 size-[32rem] rounded-full bg-emerald-500/[.05] blur-3xl" />{cameraOpen && <CameraScanner onClose={() => setCameraOpen(false)} />}{qrGeneratorOpen && <QRGenerator onClose={() => setQrGeneratorOpen(false)} />}
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-20 flex w-[272px] flex-col border-r border-white/[.08] bg-[#111816]/90 p-5 shadow-[18px_0_60px_rgba(0,0,0,.18)] backdrop-blur-xl transition-transform lg:relative lg:translate-x-0`}>
          <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#8ed8ff] text-[#172116]"><Wrench className="size-5" /></div><span className="text-lg font-semibold tracking-tight">fixbuddy</span></div><button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-white/50 hover:bg-white/5 lg:hidden" aria-label="Menüyü kapat"><X className="size-5" /></button></div>
          <button onClick={() => { setMessages([]); setInput('') }} className="mt-10 flex items-center gap-3 rounded-xl bg-[#8ed8ff] px-4 py-3 text-sm font-semibold text-[#0b1720] shadow-[0_8px_28px_rgba(185,246,106,.12)]"><Plus className="size-4" />Yeni soru</button>
          <nav className="mt-8 flex flex-col gap-2 text-sm"><p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.18em] text-white/35">Menü</p><a className="flex items-center gap-3 rounded-xl bg-white/[.06] px-3 py-3 text-white" href="#"><MessageCircle className="size-4 text-[#8ed8ff]" />Sohbetler</a><a className="flex items-center gap-3 rounded-xl px-3 py-3 text-white/55 hover:bg-white/[.04]" href="#"><Home className="size-4" />Ev rehberi</a><button onClick={() => setQrGeneratorOpen(true)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-white/55 hover:bg-white/[.04]"><QrCode className="size-4" />QR üretici</button><a className="flex items-center gap-3 rounded-xl px-3 py-3 text-white/55 hover:bg-white/[.04]" href="#"><CheckCircle2 className="size-4" />Tamamlananlar</a></nav>
          <div className="mt-auto rounded-none border border-white/[.08] bg-white/[.035] p-4"><div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#8ed8ff]"><ShieldCheck className="size-4" />Güvenli yardım</div><p className="text-xs leading-5 text-white/45">Elektrik ve gaz işlerinde her zaman bir uzmana danış.</p></div>
        </aside>
        {sidebarOpen && <button className="fixed inset-0 z-10 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Menüyü kapat" />}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[76px] items-center justify-between border-b border-white/[.08] px-5 sm:px-10"><button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-white/65 hover:bg-white/5 lg:hidden" aria-label="Menüyü aç"><Menu className="size-5" /></button><div className="hidden text-sm text-white/35 lg:block">Bugün neyi birlikte çözelim?</div><div className="ml-auto flex items-center gap-2 sm:gap-3"><button onClick={() => setQrGeneratorOpen(true)} className="flex items-center gap-2 rounded-xl border border-[#8ed8ff]/30 bg-[#8ed8ff]/10 px-3 py-2 text-xs font-semibold text-[#bce9ff] shadow-[0_8px_24px_rgba(142,216,255,.08)] transition hover:border-[#8ed8ff]/60 hover:bg-[#8ed8ff]/20" aria-label="QR kodu üret"><QrCode className="size-4" /> <span className="hidden sm:inline">QR üret</span></button><div className="hidden items-center gap-2 rounded-full border border-white/[.08] px-3 py-1.5 text-xs text-white/45 sm:flex"><span className="size-1.5 rounded-full bg-[#8ed8ff]" />AI hazır</div><div className="grid size-8 place-items-center rounded-full bg-[#263d4b] text-xs font-semibold text-[#bce9ff]">AK</div></div></header>
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-8 pt-14 sm:px-10 sm:pt-20">
            {messages.length === 0 ? <div className="my-auto"><div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#8ed8ff]/20 bg-[#8ed8ff]/[.07] px-3 py-1.5 text-[11px] font-semibold tracking-[.16em] text-[#8ed8ff]"><Sparkles className="size-3.5" />PRATİK YARDIMCIN</div><h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-.04em] text-white sm:text-6xl">Evinle ilgili her şey,<br /><span className="text-white/35">birlikte daha kolay.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-white/45">Sorunu anlat, fotoğrafını ekle veya sesli sor. fixbuddy sana adım adım, anlaşılır çözümler sunsun.</p><div className="mt-10 grid gap-3 sm:grid-cols-3">{starterPrompts.map((prompt, index) => <button key={prompt} onClick={() => setInput(prompt)} className="group rounded-none border border-white/[.08] bg-white/[.035] p-4 text-left shadow-[0_12px_40px_rgba(0,0,0,.12)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-[#8ed8ff]/30 hover:bg-white/[.07]"><div className="mb-7 flex size-8 items-center justify-center rounded-lg bg-white/[.06] text-[#8ed8ff]">{index === 0 ? <Wrench className="size-4" /> : index === 1 ? <Hammer className="size-4" /> : <Lightbulb className="size-4" />}</div><span className="text-sm text-white/65 group-hover:text-white">{prompt}</span></button>)}</div></div> : <div className="flex flex-1 flex-col gap-6 pb-8">{messages.map((message, index) => <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-none px-5 py-4 text-sm leading-6 ${message.role === 'user' ? 'bg-[#8ed8ff] text-[#0b1720]' : 'border border-white/[.08] bg-white/[.04] text-white/80'}`}><p>{message.content}</p>{message.solved && message.qr && <div className="mt-5 border-t border-white/10 pt-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#8ed8ff]"><QrCode className="size-4" />Çözüm kaydedildi</div><p className="mt-2 text-xs leading-5 text-white/45">Bu QR kodu daha sonra okutularak aynı çözüme hızlıca ulaşılabilir.</p><div className="mt-3 flex flex-wrap items-center gap-4"><div className="rounded-xl bg-[#8ed8ff] p-2"><img src={message.qr} alt="Çözüm için QR kod" className="size-32" /></div><button type="button" onClick={() => setCameraOpen(true)} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65 hover:bg-white/5"><Camera className="size-4" />QR okut</button></div></div>}</div></div>)}{loading && <div className="flex items-center gap-2 text-sm text-white/40"><span className="size-2 animate-pulse rounded-full bg-[#8ed8ff]" />fixbuddy düşünüyor...</div>}</div>}
            <form onSubmit={submitQuestion} className="mt-10"><div className="rounded-none border border-white/[.12] bg-[#18201d] p-2 shadow-2xl shadow-black/20 focus-within:border-[#8ed8ff]/45"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); submitQuestion() } }} placeholder="Bir tamir sorusu yaz..." rows={2} className="w-full resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" aria-label="Tamir sorunuz" /><div className="flex items-center justify-between px-2 pb-1"><div className="flex items-center gap-1"><button type="button" onClick={() => setCameraOpen(true)} className="rounded-lg p-2 text-white/35 hover:bg-white/[.06] hover:text-white/70" aria-label="Kamera ile QR tara"><Camera className="size-4" /></button><button type="button" className="rounded-lg p-2 text-white/35 hover:bg-white/[.06] hover:text-white/70" aria-label="Sesli soru"><Mic className="size-4" /></button><span className="ml-2 hidden text-[11px] text-white/25 sm:inline">Fotoğraf veya ses de ekleyebilirsin</span></div><button type="submit" disabled={!input.trim() || loading} className="grid size-9 place-items-center rounded-xl bg-[#8ed8ff] text-[#0b1720] transition hover:bg-[#d2ff9a] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Soruyu gönder"><ArrowUp className="size-4" /></button></div></div><div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-white/25"><Clock3 className="size-3" />Yanıtlar öneri niteliğindedir · Önemli işlerde uzman çağır</div></form>
          </div>
        </section>
      </div>
    </main>
  )
}
