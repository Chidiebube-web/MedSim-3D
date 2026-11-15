window.MEDSIM_DATA = {
    cases: {
      female: {
        gender: 'female',
        name: 'Mrs. Folake Adebayo, 54F',
        meta: 'Hosp #AE-8841 • Triage: RED (Immediate) • Weight: 68kg',
        diagnosisTitle: 'DIAGNOSIS: UROSEPSIS WITH SEPTIC SHOCK',
        skinHex: 0x6b442a,
        gownHex: 0x0284c7,
        presentingComplaint: 'Brought in by her daughter with fever, rigors, and acute confusion.',
        clerkingDialogue: [
          {
            id: 'q_onset',
            speaker: 'Relative (Daughter)',
            question: 'What brought her in today, and when did it start?',
            answer: '"Doctor, it started 3 days ago with painful urination and lower back pain. Since 6 AM today she started shivering violently and talking out of sense."'
          },
          {
            id: 'q_urinary',
            speaker: 'Patient (Mrs. Adebayo)',
            question: 'Do you have pain when passing urine or flank pain?',
            answer: '"Yes... it burns so much... and my left back is throbbing..."'
          },
          {
            id: 'q_pmh',
            speaker: 'Relative (Daughter)',
            question: 'Does she have any medical conditions or take regular drugs?',
            answer: '"She has Type 2 Diabetes and high blood pressure. She takes Metformin and Amlodipine, though she skipped them yesterday because she was vomiting."'
          },
          {
            id: 'q_allergies',
            speaker: 'Relative (Daughter)',
            question: 'Any known drug allergies or reactions to penicillin?',
            answer: '"No, doctor. She has never reacted to any injection or tablet."'
          },
          {
            id: 'q_lastmeal',
            speaker: 'Relative (Daughter)',
            question: 'When did she last eat, drink, or pass urine?',
            answer: '"She only took two sips of water last night, and she hasn\'t passed any urine since yesterday evening."'
          }
        ],
        historyDetails: {
          auscultation: 'Vesicular breath sounds bilaterally; tachypnoeic at 28/min. Heart sounds S1+S2 rapid, no murmurs.',
          abdomen: 'Suprapubic tenderness and marked left renal angle (costovertebral) tenderness. Guarding absent.'
        },
        baselineVitals: {
          hr: 126,
          spo2: 89,
          sbp: 82,
          dbp: 46,
          rr: 28,
          temp: 38.9,
          gcs: 14,
          lactate: 4.8,
          uo: 12
        },
        labsData: {
            fbcPanel: [
              'Hb: 11.4 g/dL | Hct: 34% | Platelets: 118 ×10⁹/L (Thrombocytopenia)',
              'WBC: 22.6 ×10⁹/L (Neutrophils: 89% with toxic granulation)',
              'Na+: 133 mmol/L | K+: 5.1 mmol/L | Urea: 12.4 mmol/L | Creatinine: 176 µmol/L (AKI Stage 2)',
              'CRP: 268 mg/L | INR: 1.4 | Random Blood Glucose: 14.8 mmol/L'
            ],
            urineDip: 'Leukocytes +++, Nitrites POSITIVE, Blood ++, Protein +, Glucose ++, Ketones Trace',
            urineMicroscopy: 'Pus cells > 50/HPF, numerous Gram-negative rods seen on microscopy (MC&S incubated).',
            bloodCulturePositive: 'PRELIMINARY GRAM STAIN (2/2 Bottles): Gram-negative bacilli detected in aerobic & anaerobic bottles (Probable E. coli — sensitivities pending).',
            bloodCultureSterilized: 'PRELIMINARY REPORT: No organisms seen on Gram stain at 24h — culture yield likely suppressed by prior antimicrobial administration.'
          },
          aiFactSheet: {
            patientName: 'Mrs. Folake Adebayo, 54-year-old female',
            accompanyingRelative: 'Bisi (Adult Daughter)',
            chiefComplaint: 'High fever, uncontrollable shivering (rigors), painful urination, left lower back pain, and new confusion since 6:00 AM today.',
            historyOfPresentingIllness: 'Started 3 days ago with burning pain when passing urine (dysuria) and frequent urination. Yesterday she developed dull aching pain in her left lower back/flank and vomited twice. This morning at 6 AM she began shaking violently with chills and became drowsy and disoriented.',
            pertinentNegatives: 'No cough, no shortness of breath prior to today, no chest pain, no diarrhoea, no rash, no recent travel, no head injury.',
            pastMedicalHistory: 'Type 2 Diabetes Mellitus for 8 years, Hypertension for 5 years.',
            drugHistory: 'Metformin 1g BD, Amlodipine 10mg OD. She missed her doses yesterday because of nausea/vomiting. No herbal concoctions or recent antibiotics.',
            allergies: 'No known drug allergies (NKDA).',
            socialAndLastMeal: 'Secondary school teacher, does not smoke or drink alcohol. Last ate pap yesterday morning; only sipped water last night. Has barely passed any dark urine since yesterday afternoon.'
          },
      },
      male: {
        gender: 'male',
        name: 'Mr. Chinedu Okafor, 62M',
        meta: 'Hosp #AE-9104 • Triage: RED (Immediate) • Weight: 76kg',
        diagnosisTitle: 'DIAGNOSIS: SEVERE CAP WITH SEPTIC SHOCK',
        skinHex: 0x5c3820,
        gownHex: 0x0f766e,
        presentingComplaint: 'Brought in by his wife with progressive breathlessness and high fever.',
        clerkingDialogue: [
          {
            id: 'q_onset',
            speaker: 'Patient (Mr. Okafor)',
            question: 'What brought you in today, and how long have you felt like this?',
            answer: '"Five days... bad cough... bringing up rusty brown phlegm... since this morning I can\'t catch my breath..."'
          },
          {
            id: 'q_chestpain',
            speaker: 'Patient (Mr. Okafor)',
            question: 'Does your chest hurt when you cough or breathe in?',
            answer: '"Sharp pain... right side of my ribs... every time I breathe deep..."'
          },
          {
            id: 'q_pmh',
            speaker: 'Relative (Wife)',
            question: 'Any past medical problems, smoking history, or regular medications?',
            answer: '"He has an enlarged prostate on Tamsulosin, and he used to smoke heavily for 20 years before stopping."'
          },
          {
            id: 'q_allergies',
            speaker: 'Relative (Wife)',
            question: 'Is he allergic to any antibiotics or medications?',
            answer: '"No known drug allergies at all."'
          },
          {
            id: 'q_lastmeal',
            speaker: 'Relative (Wife)',
            question: 'When did he last eat or pass urine?',
            answer: '"He hasn\'t eaten since yesterday afternoon and has barely passed any urine today."'
          }
        ],
        historyDetails: {
          auscultation: 'Coarse bronchial breath sounds and crepitations over the right lower zone. Rapid regular tachycardia.',
          abdomen: 'Soft, non-tender. Mildly distended bladder palpable.'
        },
        baselineVitals: {
          hr: 132,
          spo2: 86,
          sbp: 80,
          dbp: 44,
          rr: 32,
          temp: 39.3,
          gcs: 14,
          lactate: 5.2,
          uo: 10
        },
        labsData: {
            fbcPanel: [
              'Hb: 13.1 g/dL | Hct: 39% | Platelets: 142 ×10⁹/L',
              'WBC: 24.8 ×10⁹/L (Neutrophils: 91% with left shift)',
              'Na+: 131 mmol/L (Hyponatraemia) | K+: 4.6 mmol/L | Urea: 11.2 mmol/L | Creatinine: 148 µmol/L',
              'CRP: 310 mg/L | INR: 1.3 | Albumin: 28 g/L'
            ],
            urineDip: 'Leukocytes Negative, Nitrites Negative, Specific Gravity 1.028 (Concentrated)',
            urineMicroscopy: 'No pus cells or organisms seen. Urinary Legionella/Pneumococcal antigen sent.',
            bloodCulturePositive: 'PRELIMINARY GRAM STAIN (2/2 Bottles): Gram-positive lancet-shaped diplococci detected (Probable Streptococcus pneumoniae — sensitivities pending).',
            bloodCultureSterilized: 'PRELIMINARY REPORT: No growth detected — sample drawn after empirical IV antibiotics.'
        },
        aiFactSheet: {
            patientName: 'Mr. Chinedu Okafor, 62-year-old male',
            accompanyingRelative: 'Mrs. Ngozi Okafor (Wife)',
            chiefComplaint: '5-day history of worsening cough with rusty brown phlegm, high fever, sharp right-sided chest pain on breathing, and severe breathlessness today.',
            historyOfPresentingIllness: 'Began 5 days ago with fever, body aches, and a dry cough that turned productive of thick rusty-brown sputum 3 days ago. Developed sharp right-sided rib pain when breathing in deeply or coughing. Today he became severely short of breath even while resting and feels lightheaded.',
            pertinentNegatives: 'No pain passing urine, no abdominal pain, no leg swelling, no haemoptysis (frank red blood), no known TB contact.',
            pastMedicalHistory: 'Benign Prostatic Hyperplasia (BPH). No history of asthma, diabetes, or heart failure.',
            drugHistory: 'Tamsulosin 0.4mg nocte. Took paracetamol tablets at home two days ago with minimal relief.',
            allergies: 'No known drug allergies (NKDA).',
            socialAndLastMeal: 'Retired civil engineer. Ex-smoker (smoked 1 pack/day for 20 years, quit 6 years ago), occasional social alcohol. Last ate yesterday afternoon; passed very little dark urine today.'
        },
      },
    },
  
    sepsisSixItems: [
      { id: 'o2',     label: '1. High-Flow Oxygen (Target SpO2 ≥ 94%)' },
      { id: 'bc',     label: '2. Blood Cultures (Before IV Antibiotics)' },
      { id: 'abx',    label: '3. Broad-Spectrum IV Antibiotics' },
      { id: 'fluids', label: '4. IV Crystalloid Fluid Resuscitation' },
      { id: 'lac',    label: '5. Measure Serum Lactate & FBC/U&E' },
      { id: 'uo',     label: '6. Catheterize & Hourly Urine Output' }
    ],
  
    clinicalActions: {
      exam: [
        { id: 'ex_airway', title: 'A: Assess Airway & GCS', sub: 'Check patency, vocalization & Glasgow Coma Scale', tag: 'Airway', cam: 'head' },
        { id: 'ex_chest',  title: 'B: Auscultate Thorax', sub: 'Listen to lung fields & assess respiratory effort', tag: 'Breathing', cam: 'chest' },
        { id: 'ex_crt',    title: 'C: Check Pulse & CRT', sub: 'Assess radial pulse volume & capillary refill time', tag: 'Circulation', cam: 'arm' },
        { id: 'ex_abdo',   title: 'D/E: Palpate Abdomen & Loin', sub: 'Examine for peritonism, renal angle tenderness & rashes', tag: 'Exposure', cam: 'default' }
      ],
      procedures: [
        { id: 'proc_o2',    title: 'Apply 15L/min O2 (Non-Rebreather)', sub: 'High-flow reservoir mask oxygen therapy', tag: 'Oxygen', cam: 'head' },
        { id: 'proc_iv',    title: 'Insert 2x Large-Bore IV Cannulae', sub: 'Bilateral 16G antecubital fossa venous access', tag: 'Access', cam: 'arm' },
        { id: 'proc_foley', title: 'Insert Foley Catheter + Urometer', sub: 'Strict hourly urine output measurement', tag: 'Output', cam: 'default' }
      ],
      drugs: [
        { id: 'drug_saline', title: 'IV 0.9% Normal Saline 500mL', sub: 'Rapid crystalloid stat bolus over 15 mins', tag: 'Crystalloid' },
        { id: 'drug_rl',     title: 'IV Hartmann\'s (Ringer\'s) 500mL', sub: 'Balanced crystalloid bolus over 15 mins', tag: 'Crystalloid' },
        { id: 'drug_ceft',   title: 'IV Ceftriaxone 2g + Gentamicin', sub: 'Broad-spectrum empirical antimicrobial cover', tag: 'Antibiotic' },
        { id: 'drug_pip',    title: 'IV Piperacillin-Tazobactam 4.5g', sub: 'Broad-spectrum anti-pseudomonal cover', tag: 'Antibiotic' },
        { id: 'drug_para',   title: 'IV Paracetamol 1g Infusion', sub: 'Antipyretic infusion for pyrexia', tag: 'Analgesic' },
        { id: 'drug_norepi', title: 'IV Noradrenaline Infusion', sub: 'Continuous vasopressor titration', tag: 'Vasopressor' }
      ],
      labs: [
        { id: 'lab_bc',   title: '2 Sets Blood Cultures', sub: 'Aerobic & anaerobic peripheral venous bottles', tag: 'Microbiology' },
        { id: 'lab_vbg',  title: 'Point-of-Care VBG & Lactate', sub: 'Immediate pH, base excess & serum lactate', tag: 'Blood Gas' },
        { id: 'lab_fbc',  title: 'Send FBC, U&E, CRP & Clotting', sub: 'Urgent full blood count, renal & inflammatory panel', tag: 'Haem/Chem' },
        { id: 'lab_msu',  title: 'Urine Dipstick & MSU Culture', sub: 'Bedside urinalysis & microscopy/culture', tag: 'Urinalysis' }
      ]
    }
  };