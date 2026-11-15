(function () {
    const DATA = window.MEDSIM_DATA;
    const MAX_SIM_SECONDS = 600; // 10-minute A&E resuscitation window
    let currentCaseKey = 'female';
    let activeTab = 'clerking';
  
    const simState = {
      elapsedSec: 0,
      speed: 1,
      ended: false,
      deteriorationWarned: false,
      clerkingTarget: 'Relative', // Default speaker ('Patient' or 'Relative')
      chatHistory: [],            // Stores recent Q&A turns for AI context
      isAskingQuestion: false,    // Prevents duplicate requests while awaiting AI
      lastDialogueSpeaker: null,
      lastDialogueReply: null,
      pendingLabs: [],
      baselineVitals: {},
      vitals: {},
      interventions: {
        o2Given: false,
        ivAccess: false,
        bloodCultures: false,
        abxGiven: false,
        abxBeforeCultures: false,
        fluidBoluses: 0,
        lactateChecked: false,
        catheterized: false,
        norepiRunning: false,
        paracetamolGiven: false
      },
      completedActions: new Set(),
      sepsisSix: {
        o2: false,
        bc: false,
        abx: false,
        fluids: false,
        lac: false,
        uo: false
      }
    };
  
    // Initialize 3D Scene
    const scene3D = new window.MedSimScene3D('canvas-container', 'hotspots-layer', hotspot => {
      switchTab(hotspot.tab);
      document.querySelectorAll('.cam-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.cam === hotspot.cam);
      });
    });
  
    // Initialize Waveform Canvas
    const waveCanvas = document.getElementById('waveform-canvas');
    const waveCtx = waveCanvas.getContext('2d');
    let wavePhase = 0;
  
    function resizeWaveCanvas() {
      waveCanvas.width = waveCanvas.clientWidth * window.devicePixelRatio;
      waveCanvas.height = waveCanvas.clientHeight * window.devicePixelRatio;
    }
    window.addEventListener('resize', resizeWaveCanvas);
    resizeWaveCanvas();
  
    function drawWaveforms() {
      const w = waveCanvas.width;
      const h = waveCanvas.height;
      waveCtx.fillStyle = 'rgba(3, 7, 18, 0.22)';
      waveCtx.fillRect(0, 0, w, h);
  
      const hrFactor = simState.vitals.hr / 60;
      wavePhase += 0.06 * hrFactor;
      const x = (wavePhase * 28) % w;
  
      // Lead II ECG Trace
      const beatPos = wavePhase % (Math.PI * 2);
      let ecgY = h * 0.34;
      if (beatPos > 2.8 && beatPos < 3.0) ecgY -= h * 0.22;
      else if (beatPos >= 3.0 && beatPos < 3.15) ecgY += h * 0.12;
      else if (beatPos > 3.6 && beatPos < 4.1) ecgY -= h * 0.07;
  
      waveCtx.fillStyle = '#10b981';
      waveCtx.fillRect(x, ecgY, 3.5, 3.5);
  
      // SpO2 Plethysmograph Trace
      const plethY = h * 0.74 - Math.sin(wavePhase) * (h * 0.11);
      waveCtx.fillStyle = '#38bdf8';
      waveCtx.fillRect(x, plethY, 3, 3);
    }
  
    function showToast(msg, isAlert = false) {
      const t = document.getElementById('toast-banner');
      t.textContent = msg;
      t.style.borderColor = isAlert ? '#ef4444' : '#38bdf8';
      t.style.background = isAlert ? 'rgba(127, 29, 29, 0.95)' : 'rgba(15, 23, 42, 0.94)';
      t.style.color = isAlert ? '#fecaca' : '#e0f2fe';
      t.classList.add('show');
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
    }
  
    function formatTime(sec) {
      const m = Math.floor(sec / 60).toString().padStart(2, '0');
      const s = Math.floor(sec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }
  
    function addLog(text, type = 'info') {
      const feed = document.getElementById('clinical-log');
      const div = document.createElement('div');
      div.className = `log-entry ${type}`;
      div.innerHTML = `<div class="log-time">[T+${formatTime(simState.elapsedSec)}]</div><div>${text}</div>`;
      feed.prepend(div);
    }
  
    function scheduleLabResult(id, delaySec, callback) {
      simState.pendingLabs.push({
        id,
        readyAtSec: simState.elapsedSec + delaySec,
        callback
      });
    }
  
    // Compute % Deterioration relative to baseline admission parameters
    function calculateDeteriorationPercent() {
      const b = simState.baselineVitals;
      const v = simState.vitals;
  
      const baseMap = (b.sbp + 2 * b.dbp) / 3;
      const currMap = (v.sbp + 2 * v.dbp) / 3;
  
      const mapDropRatio = Math.max(0, (baseMap - currMap) / baseMap);
      const spo2DropRatio = Math.max(0, (b.spo2 - v.spo2) / 25);
      const hrRiseRatio = Math.max(0, (v.hr - b.hr) / 60);
      const lactateRiseRatio = Math.max(0, (v.lactate - b.lactate) / 6);
  
      const compositeWorsening =
        (mapDropRatio * 0.45 + spo2DropRatio * 0.25 + hrRiseRatio * 0.15 + lactateRiseRatio * 0.15) * 100;
  
      return Math.round(compositeWorsening);
    }
  
    // Render Bottom Horizontal Action Drawer
    function renderActions(tabName) {
      activeTab = tabName;
      const container = document.getElementById('actions-container');
      container.innerHTML = '';
  
      if (tabName === 'clerking') {
        // 1. Interactive Free-Text Question Input & Speaker Selector Card
        const inputCard = document.createElement('div');
        inputCard.className = 'clerking-input-card';
        inputCard.innerHTML = `
          <div class="clerking-input-top">
            <span class="dialogue-speaker">ASK BEDSIDE QUESTION</span>
            <div class="speaker-toggle">
              <button type="button" class="spk-btn ${simState.clerkingTarget === 'Patient' ? 'active' : ''}" data-target="Patient">👤 Patient</button>
              <button type="button" class="spk-btn ${simState.clerkingTarget === 'Relative' ? 'active' : ''}" data-target="Relative">👪 Relative</button>
            </div>
          </div>
          <form class="clerking-form" id="clerking-form">
            <input
              type="text"
              id="clerking-question-input"
              class="clerking-input"
              placeholder="Type any clinical question (e.g., When did the fever start? Any allergies?)..."
              autocomplete="off"
            />
            <button type="submit" class="clerking-send-btn" id="clerking-send-btn" ${simState.isAskingQuestion ? 'disabled' : ''}>
              ${simState.isAskingQuestion ? '...' : 'Ask'}
            </button>
          </form>
        `;
        container.appendChild(inputCard);
  
        // 2. Latest Spoken Response Card
        const speechBox = document.createElement('div');
        speechBox.className = 'dialogue-card';
        speechBox.innerHTML = `
          <div class="dialogue-speaker">${simState.lastDialogueSpeaker || 'BEDSIDE RESPONSE'}</div>
          <div class="dialogue-text">${simState.lastDialogueReply || 'Type any question to interview the patient or accompanying relative.'}</div>
        `;
        container.appendChild(speechBox);
  
        // Bind Speaker Toggle & Form Submit
        inputCard.querySelectorAll('.spk-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            simState.clerkingTarget = btn.dataset.target;
            renderActions('clerking');
          });
        });
  
        const form = inputCard.querySelector('#clerking-form');
        const inputEl = inputCard.querySelector('#clerking-question-input');
        form.addEventListener('submit', async e => {
          e.preventDefault();
          const q = inputEl.value.trim();
          if (!q || simState.isAskingQuestion) return;
          await askBedsideQuestion(q);
        });
  
        setTimeout(() => inputEl && inputEl.focus(), 10);
        return;
      }
  
      const list = DATA.clinicalActions[tabName] || [];
      list.forEach(act => {
        const isProcedure = tabName === 'procedures';
        const isActiveProc =
          (act.id === 'proc_o2' && simState.interventions.o2Given) ||
          (act.id === 'proc_iv' && simState.interventions.ivAccess) ||
          (act.id === 'proc_foley' && simState.interventions.catheterized);
  
        const done = isProcedure ? isActiveProc : simState.completedActions.has(act.id);
  
        const btn = document.createElement('button');
        btn.className = `action-btn ${done ? 'completed' : ''}`;
        btn.innerHTML = `
          <div class="action-title">
            <span>${done ? '✓ ' : ''}${act.title}</span>
            <span class="action-tag">${done && isProcedure ? 'ACTIVE • REMOVE' : act.tag}</span>
          </div>
          <div class="action-sub">${done && isProcedure ? 'Click again to withdraw / remove device' : act.sub}</div>
        `;
        btn.addEventListener('click', () => executeClinicalAction(act));
        container.appendChild(btn);
      });
    }
  
    async function askBedsideQuestion(questionText) {
      const c = DATA.cases[currentCaseKey];
      const target = simState.clerkingTarget || 'Relative';
      simState.isAskingQuestion = true;
  
      addLog(`<strong>You (to ${target}):</strong> "${questionText}"`, 'info');
      simState.lastDialogueSpeaker = `${target.toUpperCase()} IS RESPONDING...`;
      simState.lastDialogueReply = 'Listening...';
      renderActions('clerking');
  
      simState.chatHistory.push({ role: 'doctor', text: questionText });
  
      try {
        const res = await fetch('/api/clerk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: questionText,
            speakerTarget: target,
            caseFactSheet: c.aiFactSheet,
            currentVitals: simState.vitals,
            chatHistory: simState.chatHistory
          })
        });
  
        if (!res.ok) throw new Error('API unavailable');
        const data = await res.json();
  
        simState.lastDialogueSpeaker = data.speaker.toUpperCase();
        simState.lastDialogueReply = `"${data.reply}"`;
        simState.chatHistory.push({ role: 'patient', text: data.reply });
        addLog(`<strong>${data.speaker}:</strong> "${data.reply}"`, 'good');
      } catch (err) {
        const fallbackReply = generateLocalFallbackReply(questionText, target, c.aiFactSheet);
        simState.lastDialogueSpeaker = `${target.toUpperCase()} (OFFLINE MODE)`;
        simState.lastDialogueReply = `"${fallbackReply}"`;
        addLog(`<strong>${target}:</strong> "${fallbackReply}"`, 'good');
      } finally {
        simState.isAskingQuestion = false;
        renderActions('clerking');
      }

      const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('/api/clerk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        question: questionText,
        speakerTarget: target,
        caseFactSheet: c.aiFactSheet,
        currentVitals: simState.vitals,
        chatHistory: simState.chatHistory
      })
    });
    clearTimeout(timer);
    }
  
    function generateLocalFallbackReply(q, target, fact) {
      const text = q.toLowerCase();
      if (text.includes('allerg') || text.includes('react')) return fact.allergies;
      if (text.includes('drug') || text.includes('med') || text.includes('tablet') || text.includes('take')) return fact.drugHistory;
      if (text.includes('past') || text.includes('history') || text.includes('diabet') || text.includes('hypertens') || text.includes('condition')) return fact.pastMedicalHistory;
      if (text.includes('eat') || text.includes('meal') || text.includes('drink') || text.includes('smoke') || text.includes('urine') || text.includes('pee')) return fact.socialAndLastMeal;
      if (text.includes('start') || text.includes('when') || text.includes('how long') || text.includes('happen') || text.includes('wrong')) return fact.historyOfPresentingIllness;
      return `${fact.chiefComplaint} (${fact.pertinentNegatives})`;
    }
  
    function switchTab(tabName) {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabName);
      });
      renderActions(tabName);
    }
  
    // Execute Clinical Interventions
    function executeClinicalAction(act) {
      if (simState.ended) return;
      const c = DATA.cases[currentCaseKey];
      const v = simState.vitals;
      const iv = simState.interventions;
  
      if (act.cam) {
        scene3D.setCameraPreset(act.cam);
        document.querySelectorAll('.cam-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.cam === act.cam);
        });
      }
  
      switch (act.id) {
        // --- A-E PHYSICAL EXAM ---
        case 'ex_airway':
          simState.completedActions.add(act.id);
          addLog(`<strong>A (Airway & CNS):</strong> Airway patent, speaking in short phrases. GCS ${v.gcs}/15 (E4 V4 M6).`, 'info');
          showToast(`Airway patent • GCS ${v.gcs}/15`);
          break;
  
        case 'ex_chest':
          simState.completedActions.add(act.id);
          addLog(`<strong>B (Breathing Auscultation):</strong> ${c.historyDetails.auscultation}`, 'warn');
          showToast('Chest auscultation findings logged');
          break;
  
        case 'ex_crt':
          simState.completedActions.add(act.id);
          addLog(`<strong>C (Circulation):</strong> Radial pulse thready and bounding at ${Math.round(v.hr)} bpm. Prolonged CRT = 4 seconds.`, 'warn');
          showToast('Capillary Refill Time: 4 sec (Delayed)');
          break;
  
        case 'ex_abdo':
          simState.completedActions.add(act.id);
          addLog(`<strong>D/E (Abdomen):</strong> ${c.historyDetails.abdomen}`, 'info');
          showToast('Abdominal exam findings documented');
          break;
  
        // --- REVERSIBLE BEDSIDE PROCEDURES ---
        case 'proc_o2':
          if (iv.o2Given) {
            iv.o2Given = false;
            simState.sepsisSix.o2 = false;
            simState.completedActions.delete(act.id);
            if (scene3D.patientMeshes.oxygenMaskGroup) scene3D.patientMeshes.oxygenMaskGroup.visible = false;
            document.getElementById('sub-spo2').textContent = 'Room Air (21%)';
            addLog('<strong>Oxygen Removed:</strong> Non-Rebreather mask removed; patient returned to room air (21% FiO2).', 'warn');
            showToast('Oxygen Mask Removed (Room Air)');
          } else {
            iv.o2Given = true;
            simState.sepsisSix.o2 = true;
            simState.completedActions.add(act.id);
            if (scene3D.patientMeshes.oxygenMaskGroup) scene3D.patientMeshes.oxygenMaskGroup.visible = true;
            document.getElementById('sub-spo2').textContent = '15L NRB Mask (FiO2 ~85%)';
            addLog('<strong>Oxygen Therapy:</strong> Applied 15L/min O2 via Non-Rebreather reservoir mask.', 'good');
            showToast('✓ 15L/min Oxygen Mask Applied');
          }
          break;
  
        case 'proc_iv':
          if (iv.ivAccess) {
            iv.ivAccess = false;
            iv.norepiRunning = false;
            simState.completedActions.delete(act.id);
            if (scene3D.patientMeshes.ivCannulaGroup) scene3D.patientMeshes.ivCannulaGroup.visible = false;
            if (scene3D.patientMeshes.ivBagSaline) scene3D.patientMeshes.ivBagSaline.visible = false;
            if (scene3D.patientMeshes.ivBagAbx) scene3D.patientMeshes.ivBagAbx.visible = false;
            addLog('<strong>IV Access Removed:</strong> Peripheral IV cannulae withdrawn and pressure dressing applied. Active IV infusions paused.', 'warn');
            showToast('IV Cannulae Withdrawn');
          } else {
            iv.ivAccess = true;
            simState.completedActions.add(act.id);
            if (scene3D.patientMeshes.ivCannulaGroup) scene3D.patientMeshes.ivCannulaGroup.visible = true;
            addLog('<strong>Venous Access:</strong> 2x Large-bore 16G IV cannulae secured in antecubital fossae.', 'good');
            showToast('✓ 2x 16G IV Cannulae Inserted');
          }
          break;
  
        case 'proc_foley':
          if (iv.catheterized) {
            iv.catheterized = false;
            simState.sepsisSix.uo = false;
            simState.completedActions.delete(act.id);
            if (scene3D.patientMeshes.foleyBagGroup) scene3D.patientMeshes.foleyBagGroup.visible = false;
            addLog('<strong>Catheter Removed:</strong> Foley catheter deflated and withdrawn. Hourly urine output monitoring stopped.', 'warn');
            showToast('Foley Catheter Removed');
          } else {
            iv.catheterized = true;
            simState.sepsisSix.uo = true;
            simState.completedActions.add(act.id);
            if (scene3D.patientMeshes.foleyBagGroup) scene3D.patientMeshes.foleyBagGroup.visible = true;
            addLog(`<strong>Catheterization:</strong> 14Fr Foley catheter inserted. Initial urine output: ${Math.round(v.uo)} mL/hr.`, 'good');
            showToast('✓ Foley Catheter & Urometer Connected');
          }
          break;
  
        // --- IV FLUIDS & MEDICATIONS ---
        case 'drug_saline':
        case 'drug_rl':
          if (!iv.ivAccess) {
            addLog('<strong>Action Blocked:</strong> Cannot infuse IV fluid without IV cannula access!', 'crit');
            showToast('⚠️ Insert IV Cannula first!', true);
            return;
          }
          iv.fluidBoluses++;
          simState.sepsisSix.fluids = true;
          simState.completedActions.add(act.id);
          if (scene3D.patientMeshes.ivBagSaline) scene3D.patientMeshes.ivBagSaline.visible = true;
          v.sbp = Math.min(118, v.sbp + 9);
          v.dbp = Math.min(76, v.dbp + 5);
          v.hr = Math.max(82, v.hr - 6);
          v.uo = Math.min(55, v.uo + 10);
          addLog(`<strong>IV Fluid Resuscitation:</strong> 500mL crystalloid stat bolus (#${iv.fluidBoluses}) infused.`, 'good');
          showToast(`✓ 500mL Crystalloid Bolus #${iv.fluidBoluses} Infusing`);
          break;
  
        case 'drug_ceft':
        case 'drug_pip':
          if (!iv.ivAccess) {
            addLog('<strong>Action Blocked:</strong> Secure IV cannula before administering IV medications!', 'crit');
            showToast('⚠️ Insert IV Cannula first!', true);
            return;
          }
          if (iv.abxGiven) { showToast('Broad-spectrum IV antibiotics already infused'); return; }
          iv.abxGiven = true;
          simState.sepsisSix.abx = true;
          simState.completedActions.add(act.id);
          if (scene3D.patientMeshes.ivBagAbx) scene3D.patientMeshes.ivBagAbx.visible = true;
          if (!iv.bloodCultures) {
            iv.abxBeforeCultures = true;
          }
          addLog(`<strong>Antimicrobial Therapy:</strong> ${act.title} commenced intravenously.`, 'good');
          showToast('✓ Broad-Spectrum IV Antibiotics Infusing');
          break;
  
        case 'drug_para':
          if (!iv.ivAccess) { showToast('⚠️ Insert IV Cannula first!', true); return; }
          iv.paracetamolGiven = true;
          simState.completedActions.add(act.id);
          addLog('<strong>Medication:</strong> IV Paracetamol 1g infused.', 'info');
          showToast('✓ IV Paracetamol 1g Infused');
          break;
  
        case 'drug_norepi':
          if (!iv.ivAccess) { showToast('⚠️ Insert IV Cannula first!', true); return; }
          iv.norepiRunning = !iv.norepiRunning;
          if (iv.norepiRunning) {
            simState.completedActions.add(act.id);
            addLog('<strong>Vasopressor:</strong> IV Noradrenaline infusion commenced.', 'good');
            showToast('✓ IV Noradrenaline Infusion Running');
          } else {
            simState.completedActions.delete(act.id);
            addLog('<strong>Vasopressor Stopped:</strong> IV Noradrenaline infusion paused.', 'warn');
            showToast('IV Noradrenaline Paused');
          }
          break;
  
        // --- LABS, CULTURES & BLOOD GAS ---
        case 'lab_bc':
          if (simState.completedActions.has(act.id)) {
            showToast('Blood cultures already drawn & incubating');
            return;
          }
          iv.bloodCultures = true;
          simState.sepsisSix.bc = true;
          simState.completedActions.add(act.id);
          const drawnAfterAbx = iv.abxGiven;
          addLog('<strong>Microbiology Ordered:</strong> 2 sets of peripheral aerobic & anaerobic blood cultures sent to Microbiology Lab. <em>(Preliminary Gram stain due in ~20s...)</em>', 'info');
          showToast('✓ Blood Cultures Sent — Lab Processing...');
  
          scheduleLabResult('lab_bc', 20, () => {
            const report = drawnAfterAbx
              ? c.labsData.bloodCultureSterilized
              : c.labsData.bloodCulturePositive;
            addLog(`<strong>🧪 BLOOD CULTURE RESULT:</strong> ${report}`, drawnAfterAbx ? 'warn' : 'crit');
            showToast('🧪 Blood Culture Result Returned!');
          });
          break;
  
        case 'lab_vbg':
          iv.lactateChecked = true;
          simState.sepsisSix.lac = true;
          simState.completedActions.add(act.id);
          addLog(`<strong>Point-of-Care VBG (Immediate):</strong> pH 7.28 • pCO2 3.8 kPa • HCO3- 15.2 mmol/L • Base Excess -7.4 • <strong>Serum Lactate: ${v.lactate.toFixed(1)} mmol/L</strong>.`, 'warn');
          showToast(`✓ Point-of-Care Lactate: ${v.lactate.toFixed(1)} mmol/L`);
          break;
  
        case 'lab_fbc':
          if (simState.completedActions.has(act.id)) {
            showToast('FBC, U&E & CRP already ordered');
            return;
          }
          simState.completedActions.add(act.id);
          addLog('<strong>Urgent Bloods Ordered:</strong> FBC, U&E, CRP & Clotting sent to Haematology/Chemical Pathology. <em>(Results due in ~12s...)</em>', 'info');
          showToast('✓ Urgent FBC, U&E & CRP Sent...');
  
          scheduleLabResult('lab_fbc', 12, () => {
            const lines = c.labsData.fbcPanel.map(line => `• ${line}`).join('<br/>');
            addLog(`<strong>🧪 HAEMATOLOGY & CHEM PATH REPORT:</strong><br/>${lines}`, 'warn');
            showToast('🧪 Complete FBC & U&E Results Returned!');
          });
          break;
  
        case 'lab_msu':
          if (simState.completedActions.has(act.id)) {
            showToast('Urinalysis & MSU already sent');
            return;
          }
          simState.completedActions.add(act.id);
          addLog(`<strong>Bedside Urine Dipstick:</strong> ${c.labsData.urineDip}. Sample sent for urgent microscopy & culture...`, 'info');
          showToast('✓ Bedside Urine Dip Logged');
  
          scheduleLabResult('lab_msu', 15, () => {
            addLog(`<strong>🧪 URINE MICROSCOPY REPORT:</strong> ${c.labsData.urineMicroscopy}`, 'info');
            showToast('🧪 Urine Microscopy Returned!');
          });
          break;
      }
  
      const activeInfusions = (iv.ivAccess && iv.fluidBoluses > 0 ? 1 : 0) + (iv.ivAccess && iv.abxGiven ? 1 : 0) + (iv.ivAccess && iv.norepiRunning ? 1 : 0);
      document.getElementById('active-infusions-count').textContent = `${activeInfusions} Active Infusion(s)`;
  
      renderActions(activeTab);
      updateMonitorHUD();
    }
  
    // Physiology Engine (10-Min Resus Window + 40% Deterioration Warning)
    function stepPhysiology(dt) {
      if (simState.ended) return;
      simState.elapsedSec = Math.min(MAX_SIM_SECONDS, simState.elapsedSec + dt * simState.speed);
  
      // Dispatch pending laboratory results
      for (let i = simState.pendingLabs.length - 1; i >= 0; i--) {
        if (simState.elapsedSec >= simState.pendingLabs[i].readyAtSec) {
          const readyLab = simState.pendingLabs.splice(i, 1)[0];
          readyLab.callback();
        }
      }
  
      const v = simState.vitals;
      const iv = simState.interventions;
  
      // Oxygenation Dynamics
      if (iv.o2Given) {
        v.spo2 = Math.min(98, v.spo2 + 0.35 * dt * simState.speed);
        v.rr = Math.max(18, v.rr - 0.12 * dt * simState.speed);
      } else {
        v.spo2 = Math.max(70, v.spo2 - 0.06 * dt * simState.speed);
        v.rr = Math.min(40, v.rr + 0.05 * dt * simState.speed);
      }
  
      // Hemodynamic & Shock Progression
      const hasResus = iv.abxGiven && iv.fluidBoluses >= 1;
      if (hasResus) {
        v.sbp = Math.min(116, v.sbp + 0.24 * dt * simState.speed);
        v.dbp = Math.min(74, v.dbp + 0.16 * dt * simState.speed);
        v.hr = Math.max(86, v.hr - 0.25 * dt * simState.speed);
        v.lactate = Math.max(1.6, v.lactate - 0.015 * dt * simState.speed);
        v.uo = Math.min(52, v.uo + 0.15 * dt * simState.speed);
      } else {
        v.sbp = Math.max(44, v.sbp - 0.085 * dt * simState.speed);
        v.dbp = Math.max(24, v.dbp - 0.055 * dt * simState.speed);
        v.hr = Math.min(168, v.hr + 0.11 * dt * simState.speed);
        v.lactate = Math.min(11.5, v.lactate + 0.014 * dt * simState.speed);
        v.uo = Math.max(2, v.uo - 0.03 * dt * simState.speed);
      }
  
      if (iv.ivAccess && iv.norepiRunning && iv.fluidBoluses >= 1) {
        v.sbp = Math.min(122, v.sbp + 0.35 * dt * simState.speed);
        v.dbp = Math.min(78, v.dbp + 0.25 * dt * simState.speed);
      }
  
      if (iv.paracetamolGiven || iv.abxGiven) {
        v.temp = Math.max(37.2, v.temp - 0.008 * dt * simState.speed);
      }
  
      const map = Math.round((v.sbp + 2 * v.dbp) / 3);
      if (map < 50 || v.spo2 < 80) {
        v.gcs = Math.max(8, Math.round(v.gcs - 0.04 * dt * simState.speed));
      } else if (map >= 65 && v.spo2 >= 94) {
        v.gcs = 15;
      }
  
      updateMonitorHUD();
  
      // 1. Check 40% Deterioration Threshold Warning
      const worseningPct = calculateDeteriorationPercent();
      if (!simState.deteriorationWarned && worseningPct >= 40) {
        simState.deteriorationWarned = true;
        addLog(
          `<strong>⚠️ CRITICAL CLINICAL DETERIORATION (${worseningPct}% WORSENING):</strong> Patient's hemodynamic and respiratory parameters have deteriorated significantly from baseline! Immediate resuscitation required.`,
          'crit'
        );
        showToast('⚠️ WARNING: Patient condition deteriorating rapidly (-40%)!', true);
      }
  
      // 2. Check Early Stabilization Victory before the 10-minute mark
      const bundleCount = Object.values(simState.sepsisSix).filter(Boolean).length;
      if (bundleCount === 6 && map >= 65 && v.spo2 >= 94) {
        simState.ended = true;
        addLog(
          `<strong>🎉 PATIENT STABILIZED AT T+${formatTime(simState.elapsedSec)}:</strong> Hemodynamic targets achieved (MAP ≥ 65 mmHg, SpO2 ≥ 94%) prior to the 10-minute mark!`,
          'good'
        );
        openProtocolRevealModal('CONGRATULATIONS — PATIENT STABILIZED!', true);
        return;
      }
  
      // 3. Check 10-Minute Mark Expiry
      if (simState.elapsedSec >= MAX_SIM_SECONDS) {
        simState.ended = true;
        addLog('<strong>⏱️ 10-MINUTE RESUSCITATION WINDOW ELAPSED:</strong> Case concluded for senior consultant review.', 'warn');
        openProtocolRevealModal('10-MINUTE MARK REACHED — CASE REVIEW & PROTOCOL', false);
      }
    }
  
    function updateMonitorHUD() {
      const v = simState.vitals;
      const iv = simState.interventions;
      const map = Math.round((v.sbp + 2 * v.dbp) / 3);
  
      document.getElementById('sim-timer').textContent = formatTime(simState.elapsedSec);
      document.getElementById('val-hr').textContent = Math.round(v.hr);
      document.getElementById('val-spo2').textContent = Math.round(v.spo2);
      document.getElementById('val-bp').textContent = `${Math.round(v.sbp)}/${Math.round(v.dbp)}`;
      document.getElementById('sub-map').textContent = `MAP: ${map} mmHg`;
      document.getElementById('val-rr').textContent = Math.round(v.rr);
      document.getElementById('val-temp').textContent = v.temp.toFixed(1);
      document.getElementById('sub-gcs').textContent = `GCS: ${v.gcs}/15`;
      document.getElementById('val-uo').textContent = iv.catheterized ? `${Math.round(v.uo)}` : '--';
      document.getElementById('sub-lactate').textContent = iv.lactateChecked
        ? `Lactate: ${v.lactate.toFixed(1)} mmol/L`
        : 'Lactate: ? mmol/L';
  
      document.getElementById('box-hr').classList.toggle('critical-flash', v.hr > 130);
      document.getElementById('box-spo2').classList.toggle('critical-flash', v.spo2 < 90);
      document.getElementById('box-bp').classList.toggle('critical-flash', map < 65);
      document.getElementById('box-rr').classList.toggle('critical-flash', v.rr > 26);
  
      let news = 0;
      if (v.rr >= 25) news += 3; else if (v.rr >= 21) news += 2;
      if (v.spo2 <= 91) news += 3; else if (v.spo2 <= 93) news += 2;
      if (iv.o2Given) news += 2;
      if (v.sbp <= 90) news += 3; else if (v.sbp <= 100) news += 2;
      if (v.hr >= 131) news += 3; else if (v.hr >= 111) news += 2;
      if (v.gcs < 15) news += 3;
      if (v.temp >= 39.1) news += 2; else if (v.temp >= 38.1) news += 1;
  
      const newsEl = document.getElementById('val-news');
      newsEl.textContent = `${news} (${news >= 7 ? 'HIGH' : 'MED'})`;
      newsEl.style.background = news >= 7 ? 'rgba(239, 68, 68, 0.22)' : 'rgba(250, 204, 21, 0.2)';
      newsEl.style.color = news >= 7 ? '#fca5a5' : '#fde047';
  
      const stateText = document.getElementById('phys-state-text');
      if (map >= 65 && v.spo2 >= 94) {
        stateText.textContent = 'Hemodynamically Stabilizing';
        stateText.style.color = '#6ee7b7';
      } else if (map < 55) {
        stateText.textContent = 'Critical Decompensated Shock';
        stateText.style.color = '#fca5a5';
      } else {
        stateText.textContent = 'Critical Physiological Derangement';
        stateText.style.color = '#fde047';
      }
    }
  
    // Reveal Diagnosis & Sepsis Six Protocol Pop-Up
    function openProtocolRevealModal(headline = 'CASE DEBRIEF & PROTOCOL REVEAL', isStabilized = false) {
      const modal = document.getElementById('modal-backdrop');
      const c = DATA.cases[currentCaseKey];
      const v = simState.vitals;
      const iv = simState.interventions;
      const map = Math.round((v.sbp + 2 * v.dbp) / 3);
      const bundleCount = Object.values(simState.sepsisSix).filter(Boolean).length;
  
      const badgeEl = document.getElementById('modal-badge');
      badgeEl.textContent = isStabilized
        ? 'RESUSCITATION SUCCESSFUL • PATIENT STABILIZED'
        : 'CASE DEBRIEF & MANAGEMENT PROTOCOL';
      badgeEl.style.color = isStabilized ? '#10b981' : '#38bdf8';
  
      document.getElementById('modal-title').textContent = headline;
      document.getElementById('revealed-diagnosis-label').textContent = c.diagnosisTitle;
      document.getElementById('revealed-score-tag').textContent = `SEPSIS SIX: ${bundleCount} / 6`;
  
      const protoList = document.getElementById('modal-protocol-list');
      protoList.innerHTML = '';
      DATA.sepsisSixItems.forEach(item => {
        const done = simState.sepsisSix[item.id];
        const div = document.createElement('div');
        div.className = `proto-row ${done ? 'done' : 'missed'}`;
        div.innerHTML = `<span>${done ? '✓' : '✕'}</span><span>${item.label}</span>`;
        protoList.appendChild(div);
      });
  
      let feedback = isStabilized
        ? `Outstanding work, Doctor! You stabilized the patient in ${formatTime(simState.elapsedSec)} before the 10-minute window expired. `
        : `The 10-minute acute window concluded. This patient presented with ${c.diagnosisTitle.replace('DIAGNOSIS: ', '')}, requiring immediate execution of the Sepsis Six bundle. `;
  
      if (iv.abxBeforeCultures) {
        feedback += 'Microbiology pearl: Broad-spectrum antibiotics were given BEFORE blood cultures were drawn—always draw 2 sets of cultures prior to antimicrobials to avoid sterilizing the sample. ';
      } else if (iv.bloodCultures && iv.abxGiven) {
        feedback += 'Strong microbiological stewardship: Blood cultures were drawn prior to IV antibiotic administration. ';
      }
  
      document.getElementById('modal-desc').textContent = feedback;
      document.getElementById('modal-metrics').innerHTML = `
        <div class="metric-tile">
          <div class="metric-tile-label">PROTOCOL SCORE</div>
          <div class="metric-tile-val" style="color:#38bdf8">${bundleCount} / 6</div>
        </div>
        <div class="metric-tile">
          <div class="metric-tile-label">FINAL MAP</div>
          <div class="metric-tile-val" style="color:${map >= 65 ? '#10b981' : '#f43f5e'}">${map} mmHg</div>
        </div>
        <div class="metric-tile">
          <div class="metric-tile-label">ELAPSED TIME</div>
          <div class="metric-tile-val">${formatTime(simState.elapsedSec)}</div>
        </div>
      `;
      modal.classList.add('open');
    }
  
    function loadCase(caseKey) {
      currentCaseKey = caseKey;
      const c = DATA.cases[caseKey];
  
      document.getElementById('pt-name').textContent = c.name;
      document.getElementById('pt-meta').textContent = c.meta;
      document.getElementById('btn-case-female').classList.toggle('active', caseKey === 'female');
      document.getElementById('btn-case-male').classList.toggle('active', caseKey === 'male');
  
      // Reset simulation clock, deterioration flag, and AI clerking state
      simState.elapsedSec = 0;
      simState.ended = false;
      simState.deteriorationWarned = false;
      simState.clerkingTarget = 'Relative';
      simState.chatHistory = [];
      simState.isAskingQuestion = false;
      simState.lastDialogueSpeaker = null;
      simState.lastDialogueReply = null;
      simState.pendingLabs = [];
  
      simState.baselineVitals = { ...c.baselineVitals };
      simState.vitals = { ...c.baselineVitals };
      simState.interventions = {
        o2Given: false,
        ivAccess: false,
        bloodCultures: false,
        abxGiven: false,
        abxBeforeCultures: false,
        fluidBoluses: 0,
        lactateChecked: false,
        catheterized: false,
        norepiRunning: false,
        paracetamolGiven: false
      };
      simState.completedActions.clear();
      Object.keys(simState.sepsisSix).forEach(k => (simState.sepsisSix[k] = false));
  
      if (scene3D.patientMeshes.ivBagSaline) scene3D.patientMeshes.ivBagSaline.visible = false;
      if (scene3D.patientMeshes.ivBagAbx) scene3D.patientMeshes.ivBagAbx.visible = false;
      if (scene3D.patientMeshes.foleyBagGroup) scene3D.patientMeshes.foleyBagGroup.visible = false;
  
      scene3D.buildAnatomicalPatient(c);
  
      document.getElementById('clinical-log').innerHTML = '';
      addLog(`<strong>Triage Handover:</strong> ${c.name} admitted to Resus Bay 1. ${c.presentingComplaint}`, 'crit');
      addLog('<strong>Clinical Objective:</strong> Stabilize the patient within 10 minutes by clerking, performing an A–E exam, and executing definitive resuscitation.', 'info');
  
      renderActions(activeTab);
      updateMonitorHUD();
    }
  
    // Bind UI Events
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  
    document.querySelectorAll('.cam-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        scene3D.setCameraPreset(btn.dataset.cam);
      });
    });
  
    document.getElementById('btn-case-female').addEventListener('click', () => loadCase('female'));
    document.getElementById('btn-case-male').addEventListener('click', () => loadCase('male'));
  
    document.getElementById('btn-speed').addEventListener('click', e => {
      simState.speed = simState.speed === 1 ? 5 : 1;
      e.target.textContent = simState.speed === 1 ? '1x REALTIME' : '5x FAST-FORWARD';
      showToast(`Simulation speed set to ${simState.speed}x`);
    });
  
    document.getElementById('btn-open-modal').addEventListener('click', () => {
      simState.ended = true;
      openProtocolRevealModal('CASE ENDED — DIAGNOSIS & PROTOCOL REVEAL', false);
    });
    document.getElementById('btn-close-modal').addEventListener('click', () => {
      document.getElementById('modal-backdrop').classList.remove('open');
    });
    document.getElementById('btn-restart-sim').addEventListener('click', () => {
      document.getElementById('modal-backdrop').classList.remove('open');
      loadCase(currentCaseKey);
    });
  
    document.getElementById('glb-input').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      showToast(`Loading 3D model: ${file.name}...`);
      scene3D.loadCustomGLB(
        file,
        name => {
          addLog(`<strong>3D Asset Imported:</strong> Loaded custom patient mesh <code>${name}</code> into Resus Bay.`, 'good');
          showToast('✓ Custom 3D Patient Model Loaded');
        },
        () => showToast('⚠️ Could not parse .GLB file')
      );
    });
  
    // Main Animation & Physiology Loop
    const clock = new THREE.Clock();
    let physAccum = 0;
  
    function animate() {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();
  
      physAccum += dt;
      if (physAccum >= 1.0) {
        stepPhysiology(1.0);
        physAccum = 0;
      }
  
      scene3D.updateFrame(elapsed, simState, DATA.cases[currentCaseKey]);
      drawWaveforms();
    }
  
    // Boot Simulation
    loadCase('female');
    animate();
  })();