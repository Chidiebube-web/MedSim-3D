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
  
    const systemInstruction = `
  You are roleplaying in an Accident & Emergency medical simulation ("MedSim 3D") for clinical medical students.
  You are answering a student doctor's bedside clerking question.
  
  PATIENT & RELATIVE CLINICAL FACT SHEET:
  ${JSON.stringify(caseFactSheet, null, 2)}
  
  CURRENT PHYSIOLOGICAL STATE:
  - Glasgow Coma Scale (GCS): ${currentVitals?.gcs ?? 14}/15
  - Heart Rate: ${Math.round(currentVitals?.hr ?? 126)} bpm | SpO2: ${Math.round(currentVitals?.spo2 ?? 89)}% | BP: ${Math.round(currentVitals?.sbp ?? 82)}/${Math.round(currentVitals?.dbp ?? 46)} mmHg | Temp: ${(currentVitals?.temp ?? 38.9).toFixed(1)}°C
  
  STRICT ROLEPLAY RULES:
  1. Target Addressed: The student is speaking to "${speakerTarget}".
     - If addressing PATIENT: answer in short, distressed, breathy lay phrases appropriate for GCS ${currentVitals?.gcs ?? 14}/15. If GCS <= 12, the relative steps in to clarify.
     - If addressing RELATIVE: answer clearly and anxiously as the accompanying family member.
  2. NEVER state or hint at the medical diagnosis (do NOT say "sepsis", "septic shock", "pneumonia", or "pyelonephritis"). Use everyday lay descriptions only.
  3. Stick strictly to the Clinical Fact Sheet. Deny any symptom or history not listed naturally in character.
  4. Keep responses concise (1 to 3 sentences maximum).
  5. Return ONLY raw JSON with no markdown fences: {"speaker": "Name (Role)", "reply": "Spoken dialogue here"}
  `;
  
    try {
      const formattedHistory = (chatHistory || []).slice(-6).map(turn => ({
        role: turn.role === 'doctor' ? 'user' : 'model',
        parts: [{ text: turn.text }]
      }));
  
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [
              ...formattedHistory,
              { role: 'user', parts: [{ text: `[Addressing: ${speakerTarget}] Doctor asks: "${question}"` }] }
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 200
            }
          })
        }
      );
  
      const data = await response.json();
  
      if (!response.ok) {
        console.error('Gemini API Error:', JSON.stringify(data));
        return res.status(502).json({
          error: 'Gemini upstream error',
          details: data?.error?.message || 'Unknown upstream error'
        });
      }
  
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json|```/gi, '').trim();
  
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { speaker: speakerTarget, reply: cleaned || 'I... I am not sure, doctor.' };
      }
  
      return res.status(200).json({
        speaker: parsed.speaker || speakerTarget,
        reply: parsed.reply
      });
    } catch (err) {
      console.error('Clerk Handler Crash:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  };