export const config = { maxDuration: 60 }; // 긴 생성 대비 (플랜 한도 내에서 적용)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다. 설정 후 Redeploy 하세요.' });
  }

  const { prompt, systemPrompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: '요청 프롬프트가 비어 있습니다.' });
  }

  const modelCandidates = ['gemini-2.5-flash', 'gemini-2.5-pro'];
  const errors = [];

  for (const model of modelCandidates) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey, // URL에 키를 넣지 않음
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            ...(systemPrompt && { systemInstruction: { parts: [{ text: systemPrompt }] } }),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const text = (data.candidates?.[0]?.content?.parts || [])
          .map(p => p.text || '').join('').trim();
        if (text) return res.status(200).json({ text });
        errors.push(`${model}: 빈 응답 (${data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'unknown'})`);
      } else {
        errors.push(`${model}: ${response.status} ${data.error?.message || ''}`);
      }
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
    }
  }

  console.error('Gemini 호출 실패:', errors);
  return res.status(502).json({ error: 'Gemini API 호출 실패', details: errors });
}