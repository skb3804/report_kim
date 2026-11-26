/**
 * Vercel Serverless Function: /api/gemini
 * 클라이언트(index.html)로부터 프롬프트를 전달받아 Vercel 환경변수(GEMINI_API_KEY)를 이용해
 * 안전하게 Google Gemini API를 호출합니다.
 */
export default async function handler(req, res) {
    // CORS 헤더 설정 (필요 시 도메인 제한 가능)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    // Vercel 대시보드 > Settings > Environment Variables 에 등록할 키 이름
    // 기본 폴백으로 전달해주신 키를 설정해 두었으나, 배포 시 환경변수(GEMINI_API_KEY) 설정을 권장합니다.
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAIRbukmGCtS1jjJMVe3tESPOoddnE0HbY";

    const { prompt, systemPrompt } = req.body || {};

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    const modelCandidates = ["gemini-3-flash-preview", "gemini-2.5-flash"];

    for (const model of modelCandidates) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        if (systemPrompt) {
            payload.systemInstruction = { parts: [{ text: systemPrompt }] };
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
                if (text) {
                    return res.status(200).json({ text, model });
                }
            } else {
                const errDetail = await response.text();
                console.error(`Gemini API (${model}) Error ${response.status}:`, errDetail);
            }
        } catch (error) {
            console.error(`Gemini API (${model}) Fetch Exception:`, error);
        }
    }

    return res.status(502).json({ error: 'Failed to generate content from Gemini API.' });
}