import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(request: Request) {
  const { message } = await request.json()
  if (typeof message !== 'string' || message.trim().length === 0) {
    return Response.json({ error: 'Geçersiz soru' }, { status: 400 })
  }

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system:
      'Sen fixbuddy adlı Türkçe bir tamir yardımcısısın. Kullanıcıya ev tamiri konusunda güvenli, kısa, adım adım ve pratik öneriler ver. Elektrik, gaz veya yapısal risk varsa net biçimde profesyonel çağırmasını söyle. Bilmediğin şeyi uydurma.',
    prompt: message.trim(),
  })

  return result.toTextStreamResponse()
}
