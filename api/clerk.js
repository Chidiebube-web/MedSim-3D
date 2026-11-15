// api/clerk.js
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { question, speakerTarget, caseFactSheet, currentVitals, chatHistory } = req.body || {};
    if (!question || !caseFactSheet) {
      return res.status(400).json({ error: 'Missing question or case data' });
    }
  
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
    }
  
    const gcs = currentVitals?.gcs ?? 14;
    const isRelative = speakerTarget === 'Relative' || gcs <= 12;
    const resolvedSpeaker = isRelative
      ? (caseFactSheet.accompanyingRelative || 'Relative')
      : (caseFactSheet.patientName || 'Patient');
  
    const systemInstruction = `Roleplay in an A&E simulation as ${resolvedSpeaker}.
  Patient GCS: ${gcs}/15, HR: ${Math.round(currentVitals?.hr ?? 126)}, SpO2: ${Math.round(currentVitals?.spo2 ?? 89)}%.
  Facts: ${JSON.stringify(caseFactSheet)}
  Rules: Reply in 1-2 short natural sentences of spoken dialogue only (no JSON/labels). ${isRelative ? 'Anxious family member.' : 'Short breathy lay phrases.'} Never mention medical diagnoses. Deny unlisted symptoms naturally.`;
  
    const formattedHistory = (chatHistory || []).slice(-4).map(turn => ({
      role: turn.role === 'doctor' ? 'user' : 'model',
      parts: [{ text: turn.text }]
    }));
  
    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: `Doctor: "${question}"` }] }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 500
      }
    });
  
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8500);
  
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: payload
        }
      );
  
      clearTimeout(timeoutId);
      const data = await response.json();
  
      if (!response.ok) {
        return res.status(502).json({
          error: 'Gemini upstream error',
          details: data?.error?.message || `HTTP ${response.status}`
        });
      }
  
      const rawText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '')
        .replace(/^["']|["']$/g, '')
        .trim();
  
      return res.status(200).json({
        speaker: resolvedSpeaker,
        reply: rawText || 'Please help her, doctor...'
      });
    } catch (err) {
      clearTimeout(timeoutId);
      return res.status(502).json({
        error: 'Gemini upstream error',
        details: err.name === 'AbortError' ? 'gemini-3.8-flash timeout (>8.5s)' : err.message
      });
    }
  };