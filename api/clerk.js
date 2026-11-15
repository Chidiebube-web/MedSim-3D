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
  
    const systemInstruction = `You are roleplaying in an A&E clinical simulation as ${resolvedSpeaker}.
  Patient GCS: ${gcs}/15, HR: ${Math.round(currentVitals?.hr ?? 126)}, SpO2: ${Math.round(currentVitals?.spo2 ?? 89)}%.
  Case Facts: ${JSON.stringify(caseFactSheet)}
  
  Rules:
  - Respond ONLY with spoken dialogue in character (1 to 2 natural sentences). Do NOT output JSON, brackets, or labels.
  - ${isRelative ? 'Speak clearly and anxiously as the accompanying family member.' : 'Speak in short, distressed, breathy lay phrases.'}
  - NEVER mention medical diagnoses (no "sepsis", "shock", "pneumonia", "pyelonephritis"). Use everyday lay descriptions only.
  - Deny any symptom or history not listed in Case Facts naturally in character.`;
  
    const formattedHistory = (chatHistory || []).slice(-4).map(turn => ({
      role: turn.role === 'doctor' ? 'user' : 'model',
      parts: [{ text: turn.text }]
    }));
  
    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: `Doctor asks: "${question}"` }] }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 600
      }
    });
  
    // Primary + fast fallback models if Google experiences temporary high demand
    const models = [
      'gemini-3.8-flash',
      'gemini-3.8-flash-lite',
      'gemini-2.5-flash-lite'
    ];
  
    let lastError = 'Upstream error';
  
    for (const model of models) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
  
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: payload
          }
        );
  
        clearTimeout(timeoutId);
        const data = await response.json();
  
        if (response.ok) {
          const rawText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '')
            .replace(/^["']|["']$/g, '')
            .trim();
  
          return res.status(200).json({
            speaker: resolvedSpeaker,
            reply: rawText || 'Please help her, doctor...'
          });
        }
  
        lastError = data?.error?.message || `HTTP ${response.status}`;
  
        // If model is overloaded (503) or rate-limited (429), immediately try next model
        if (response.status === 503 || response.status === 429 || response.status === 404) {
          continue;
        }
  
        // Stop immediately on auth errors (400/401/403)
        break;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err.name === 'AbortError' ? `${model} timeout` : err.message;
      }
    }
  
    return res.status(502).json({
      error: 'Gemini upstream error',
      details: lastError
    });
  };