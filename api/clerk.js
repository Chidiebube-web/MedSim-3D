// api/clerk.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { question, speakerTarget, caseFactSheet, currentVitals, chatHistory } = req.body;
  
    if (!question || !caseFactSheet) {
      return res.status(400).json({ error: 'Missing question or case data' });
    }
  
    const systemInstruction = `
  You are roleplaying in an Accident & Emergency medical simulation ("MedSim 3D") for clinical medical students.
  You are answering a student doctor's bedside clerking question.
  
  PATIENT & RELATIVE CLINICAL FACT SHEET:
  ${JSON.stringify(caseFactSheet, null, 2)}
  
  CURRENT PHYSIOLOGICAL STATE:
  - Glasgow Coma Scale (GCS): ${currentVitals.gcs}/15
  - Heart Rate: ${Math.round(currentVitals.hr)} bpm | SpO2: ${Math.round(currentVitals.spo2)}% | BP: ${Math.round(currentVitals.sbp)}/${Math.round(currentVitals.dbp)} mmHg | Temp: ${currentVitals.temp.toFixed(1)}°C
  
  STRICT ROLEPLAY RULES:
  1. Target Addressed: The student is speaking to "${speakerTarget}".
     - If the student addresses the PATIENT directly, answer as the patient in short, distressed, breathy/confused lay phrases appropriate for a GCS of ${currentVitals.gcs}/15. If GCS <= 12, the patient is too drowsy/confused to give a full history, so the relative jumps in to clarify.
     - If the student addresses the RELATIVE, answer clearly and anxiously as the accompanying family member.
  2. NEVER state or hint at the medical diagnosis (do NOT say "sepsis", "septic shock", "pneumonia", or "pyelonephritis"). Use everyday lay descriptions only.
  3. Stick strictly to the Clinical Fact Sheet. For any symptom or medical history NOT listed in the fact sheet (e.g., allergies, travel, trauma, vomiting), deny it naturally in character ("No doctor, nothing like that").
  4. Keep responses concise, natural, and realistic (1 to 3 sentences maximum) so the student feels the urgency of an A&E resuscitation bay.
  5. Return ONLY valid JSON in this exact format: {"speaker": "Name (Role)", "reply": "Spoken dialogue here"}
  `;
  
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      }
  
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
              maxOutputTokens: 180,
              responseMimeType: 'application/json'
            }
          })
        }
      );
  
      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawText);
  
      return res.status(200).json({
        speaker: parsed.speaker || speakerTarget,
        reply: parsed.reply
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to generate bedside response' });
    }
  }