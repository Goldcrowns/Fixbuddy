import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(request: Request) {
  const { message } = await request.json()
  if (typeof message !== 'string' || message.trim().length === 0) {
    return Response.json({ error: 'Geçersiz soru' }, { status: 400 })
  }

  const result = streamText({
    model: google('gemini-flash-lite-latest'),
    system:
      'Sen FixBuddy adlı Türkçe bir tamir yardımcısısın. Kullanıcıya sorunu konusunda güvenli, kısa, adım adım ve ayrıntılı öneriler ver. Elektrik, gaz veya yapısal risk varsa net biçimde profesyonel birini çağırmasını söyle. Bilmediğin şeyi uydurma.',
    prompt: message.trim(),
  })

  return result.toTextStreamResponse()
}
