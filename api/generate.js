export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Vercel 환경 변수에 GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  const { prompt, systemPrompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: '요청 프롬프트가 비어 있습니다.' });
  }

  // 기존 코드에 있던 모델 우선순위 그대로 적용
  const modelCandidates = ['gemini-2.5-flash', 'gemini-2.5-pro'];

  for (const model of modelCandidates) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        ...(systemPrompt && {
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        if (text) {
          return res.status(200).json({ text });
        }
      } else {
        const errData = await response.json();
        console.warn(`Gemini API (${model}) 응답 오류:`, errData);
      }
    } catch (error) {
      console.warn(`Gemini API (${model}) 호출 실패:`, error);
    }
  }

  return res.status(502).json({ error: 'Gemini API 호출에 실패했습니다.' });
}