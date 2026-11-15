class MedSimScene3D {
    constructor(containerId, hotspotsId, onHotspotClick) {
      this.container = document.getElementById(containerId);
      this.hotspotsLayer = document.getElementById(hotspotsId);
      this.onHotspotClick = onHotspotClick;
  
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x070c16);
      this.scene.fog = new THREE.FogExp2(0x070c16, 0.065);
  
      this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
      this.camera.position.set(2.35, 2.05, 2.55);
  
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);
  
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.target.set(0, 0.88, 0);
      this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
      this.controls.minDistance = 0.85;
      this.controls.maxDistance = 5.5;
  
      this.camTargetPos = null;
      this.camTargetLook = null;
  
      this.patientRoot = new THREE.Group();
      this.scene.add(this.patientRoot);
  
      this.patientMeshes = {
        skinMaterials: [],
        chestGroup: null,
        abdomenMesh: null,
        headGroup: null,
        oxygenMaskGroup: null,
        ivCannulaGroup: null,
        ivBagSaline: null,
        ivBagAbx: null,
        foleyBagGroup: null,
        foleyUrineFill: null
      };
  
      this.hotspotsData = [
        { id: 'head',  label: 'A: Airway / GCS',      pos: new THREE.Vector3(0, 1.38, -0.58), tab: 'exam', cam: 'head' },
        { id: 'chest', label: 'B: Auscultate Chest',  pos: new THREE.Vector3(0, 1.15, -0.18), tab: 'exam', cam: 'chest' },
        { id: 'arm',   label: 'C: IV Site & CRT',     pos: new THREE.Vector3(0.38, 0.96, -0.05), tab: 'procedures', cam: 'arm' },
        { id: 'abdo',  label: 'D/E: Abdomen / Foley', pos: new THREE.Vector3(0, 0.98, 0.16), tab: 'procedures', cam: 'default' }
      ];
      this.hotspotElements = [];
  
      this._initLights();
      this._buildHospitalEnvironment();
      this._initHotspotsDOM();
  
      window.addEventListener('resize', () => this._onResize());
    }
  
    _initLights() {
      const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.55);
      this.scene.add(ambientLight);
  
      const surgicalLight = new THREE.SpotLight(0xf8fafc, 1.45);
      surgicalLight.position.set(0.3, 3.8, 0.6);
      surgicalLight.angle = Math.PI / 3;
      surgicalLight.penumbra = 0.5;
      surgicalLight.castShadow = true;
      surgicalLight.shadow.mapSize.width = 1024;
      surgicalLight.shadow.mapSize.height = 1024;
      this.scene.add(surgicalLight);
  
      const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
      rimLight.position.set(-2.5, 2.2, -2.0);
      this.scene.add(rimLight);
    }
  
    _buildHospitalEnvironment() {
      const envGroup = new THREE.Group();
  
      // Tiled Floor & Grid
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.1 });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      envGroup.add(floor);
  
      const grid = new THREE.GridHelper(14, 28, 0x1e293b, 0x1e293b);
      grid.position.y = 0.002;
      envGroup.add(grid);
  
      // Headwall & Oxygen Outlet
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x111c2d, roughness: 0.7 });
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.4, 0.15), wallMat);
      backWall.position.set(0, 1.7, -1.55);
      envGroup.add(backWall);
  
      const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.3 });
      const headwallRail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 0.08), railMat);
      headwallRail.position.set(0, 1.45, -1.45);
      envGroup.add(headwallRail);
  
      // Hospital Bed & Raised Backrest
      const bedGroup = new THREE.Group();
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.35 });
      const mattressMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.65 });
      const sheetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
  
      const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 2.2), frameMat);
      baseFrame.position.set(0, 0.58, 0);
      baseFrame.castShadow = true;
      bedGroup.add(baseFrame);
  
      [[-0.44, -0.95], [0.44, -0.95], [-0.44, 0.95], [0.44, 0.95]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.58, 12), frameMat);
        leg.position.set(lx, 0.29, lz);
        bedGroup.add(leg);
      });
  
      const mattressFlat = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.14, 1.35), mattressMat);
      mattressFlat.position.set(0, 0.71, 0.38);
      mattressFlat.castShadow = true;
      bedGroup.add(mattressFlat);
  
      const backrestGroup = new THREE.Group();
      backrestGroup.position.set(0, 0.71, -0.28);
      backrestGroup.rotation.x = 0.38;
      const mattressBack = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.14, 0.82), mattressMat);
      mattressBack.position.set(0, 0, -0.38);
      backrestGroup.add(mattressBack);
  
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.30), sheetMat);
      pillow.position.set(0, 0.09, -0.55);
      backrestGroup.add(pillow);
      bedGroup.add(backrestGroup);
  
      const headBoard = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.52, 0.06), frameMat);
      headBoard.position.set(0, 0.95, -1.08);
      bedGroup.add(headBoard);
  
      const footBoard = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.40, 0.06), frameMat);
      footBoard.position.set(0, 0.84, 1.08);
      bedGroup.add(footBoard);
  
      [-0.51, 0.51].forEach(rx => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 1.15), frameMat);
        rail.position.set(rx, 0.86, 0.05);
        bedGroup.add(rail);
      });
      envGroup.add(bedGroup);
  
      // IV Pole & Hanging Fluid Bags
      const ivPoleGroup = new THREE.Group();
      ivPoleGroup.position.set(0.78, 0, -0.55);
      const poleMetal = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 });
      const poleRod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 2.05, 12), poleMetal);
      poleRod.position.y = 1.02;
      ivPoleGroup.add(poleRod);
  
      const bagSalineMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78, roughness: 0.15 });
      this.patientMeshes.ivBagSaline = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.20, 0.045), bagSalineMat);
      this.patientMeshes.ivBagSaline.position.set(-0.12, 1.85, 0);
      this.patientMeshes.ivBagSaline.visible = false;
      ivPoleGroup.add(this.patientMeshes.ivBagSaline);
  
      const bagAbxMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85, roughness: 0.2 });
      this.patientMeshes.ivBagAbx = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.04), bagAbxMat);
      this.patientMeshes.ivBagAbx.position.set(0.12, 1.88, 0);
      this.patientMeshes.ivBagAbx.visible = false;
      ivPoleGroup.add(this.patientMeshes.ivBagAbx);
      envGroup.add(ivPoleGroup);
  
      // Multiparameter Monitor on Stand
      const monGroup = new THREE.Group();
      monGroup.position.set(-0.88, 0, -0.58);
      const monStand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.35, 12), frameMat);
      monStand.position.y = 0.67;
      monGroup.add(monStand);
  
      const monBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.34, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
      );
      monBody.position.set(0, 1.42, 0);
      monBody.rotation.y = 0.42;
      monGroup.add(monBody);
  
      const monScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.40, 0.27),
        new THREE.MeshBasicMaterial({ color: 0x06281e })
      );
      monScreen.position.set(0.026, 1.42, 0.062);
      monScreen.rotation.y = 0.42;
      monGroup.add(monScreen);
      envGroup.add(monGroup);
  
      // Red Crash Cart
      const cart = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.92, 0.48),
        new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4, metalness: 0.2 })
      );
      cart.position.set(-1.38, 0.46, 0.35);
      cart.rotation.y = 0.25;
      cart.castShadow = true;
      envGroup.add(cart);
  
      // Bedside Foley Catheter Bag
      this.patientMeshes.foleyBagGroup = new THREE.Group();
      this.patientMeshes.foleyBagGroup.position.set(0.54, 0.38, 0.25);
      const bagFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.24, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.38 })
      );
      this.patientMeshes.foleyBagGroup.add(bagFrame);
  
      this.patientMeshes.foleyUrineFill = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.09, 0.16),
        new THREE.MeshStandardMaterial({ color: 0xd97706, transparent: true, opacity: 0.85 })
      );
      this.patientMeshes.foleyUrineFill.position.y = -0.06;
      this.patientMeshes.foleyBagGroup.add(this.patientMeshes.foleyUrineFill);
      this.patientMeshes.foleyBagGroup.visible = false;
      envGroup.add(this.patientMeshes.foleyBagGroup);
  
      this.scene.add(envGroup);
    }
  
    buildAnatomicalPatient(caseProfile) {
      while (this.patientRoot.children.length > 0) {
        this.patientRoot.remove(this.patientRoot.children[0]);
      }
      this.patientMeshes.skinMaterials = [];
  
      const isFemale = caseProfile.gender === 'female';
      const skinMat = new THREE.MeshStandardMaterial({
        color: caseProfile.skinHex,
        roughness: 0.55,
        metalness: 0.05
      });
      this.patientMeshes.skinMaterials.push(skinMat);
  
      const gownMat = new THREE.MeshStandardMaterial({ color: caseProfile.gownHex, roughness: 0.75 });
      const hairMat = new THREE.MeshStandardMaterial({
        color: isFemale ? 0x18181b : 0x27272a,
        roughness: 0.85
      });
      const blanketMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
  
      // Reclining Upper Body Group
      const upperBody = new THREE.Group();
      upperBody.position.set(0, 0.78, -0.22);
      upperBody.rotation.x = 0.36;
  
      // Thorax Group (Animated for breathing)
      const chestGroup = new THREE.Group();
      const shoulderWidth = isFemale ? 0.35 : 0.41;
      const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(shoulderWidth, 0.21, 0.42), gownMat);
      chestMesh.position.set(0, 0.10, -0.24);
      chestMesh.castShadow = true;
      chestGroup.add(chestMesh);
  
      if (isFemale) {
        [-0.085, 0.085].forEach(bx => {
          const contour = new THREE.Mesh(new THREE.SphereGeometry(0.072, 16, 16), gownMat);
          contour.scale.set(1.0, 0.65, 1.15);
          contour.position.set(bx, 0.18, -0.25);
          chestGroup.add(contour);
        });
      }
      upperBody.add(chestGroup);
      this.patientMeshes.chestGroup = chestGroup;
  
      // Abdomen
      const abdoMesh = new THREE.Mesh(new THREE.BoxGeometry(shoulderWidth * 0.92, 0.19, 0.30), gownMat);
      abdoMesh.position.set(0, 0.09, 0.04);
      upperBody.add(abdoMesh);
      this.patientMeshes.abdomenMesh = abdoMesh;
  
      // Neck & Head
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.12, 16), skinMat);
      neck.position.set(0, 0.13, -0.48);
      neck.rotation.x = Math.PI / 2;
      upperBody.add(neck);
  
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.17, -0.63);
  
      const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 24), skinMat);
      cranium.scale.set(0.92, 1.02, 1.12);
      cranium.castShadow = true;
      headGroup.add(cranium);
  
      const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.119, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.62),
        hairMat
      );
      hairCap.rotation.x = -Math.PI * 0.35;
      headGroup.add(hairCap);
  
      if (isFemale) {
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 14), hairMat);
        bun.position.set(0, -0.04, -0.11);
        headGroup.add(bun);
      }
  
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.045, 12), skinMat);
      nose.position.set(0, 0.11, 0.02);
      headGroup.add(nose);
  
      const browMat = new THREE.MeshBasicMaterial({ color: 0x1e1b18 });
      [-0.042, 0.042].forEach(ex => {
        const eyeLine = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.004, 0.008), browMat);
        eyeLine.position.set(ex, 0.102, 0.055);
        headGroup.add(eyeLine);
      });
  
      // Non-Rebreather Oxygen Mask (Hidden until applied)
      const maskGroup = new THREE.Group();
      const maskCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.048, 0.065, 16),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
      );
      maskCone.position.set(0, 0.105, -0.005);
      maskGroup.add(maskCone);
  
      const resBag = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.028, 0.09, 12),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 })
      );
      resBag.position.set(0, 0.08, -0.06);
      resBag.rotation.x = 0.6;
      maskGroup.add(resBag);
      maskGroup.visible = false;
      headGroup.add(maskGroup);
      this.patientMeshes.oxygenMaskGroup = maskGroup;
  
      upperBody.add(headGroup);
      this.patientMeshes.headGroup = headGroup;
  
      // Articulated Left & Right Arms
      [-1, 1].forEach(side => {
        const armGroup = new THREE.Group();
        const sx = side * (shoulderWidth / 2 + 0.045);
  
        const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 14), gownMat);
        deltoid.position.set(sx, 0.11, -0.36);
        armGroup.add(deltoid);
  
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.038, 0.28, 14), skinMat);
        upperArm.position.set(sx + side * 0.03, 0.06, -0.22);
        upperArm.rotation.x = Math.PI / 2 - 0.25;
        upperArm.rotation.z = -side * 0.15;
        armGroup.add(upperArm);
  
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.030, 0.27, 14), skinMat);
        forearm.position.set(sx + side * 0.06, -0.01, 0.02);
        forearm.rotation.x = Math.PI / 2 - 0.36;
        armGroup.add(forearm);
  
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 12), skinMat);
        hand.scale.set(0.85, 0.45, 1.35);
        hand.position.set(sx + side * 0.07, -0.05, 0.17);
        armGroup.add(hand);
  
        if (side === -1) {
          const oximeter = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, 0.022, 0.035),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
          );
          oximeter.position.set(sx - 0.07, -0.045, 0.21);
          armGroup.add(oximeter);
        }
  
        if (side === 1) {
          const ivGroup = new THREE.Group();
          const dressing = new THREE.Mesh(
            new THREE.BoxGeometry(0.045, 0.012, 0.055),
            new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
          );
          dressing.position.set(sx + 0.05, 0.028, -0.07);
          ivGroup.add(dressing);
  
          const hub = new THREE.Mesh(
            new THREE.BoxGeometry(0.018, 0.016, 0.028),
            new THREE.MeshStandardMaterial({ color: 0x10b981 })
          );
          hub.position.set(sx + 0.05, 0.036, -0.07);
          ivGroup.add(hub);
  
          ivGroup.visible = false;
          armGroup.add(ivGroup);
          this.patientMeshes.ivCannulaGroup = ivGroup;
        }
  
        upperBody.add(armGroup);
      });
  
      this.patientRoot.add(upperBody);
  
      // Lower Body & Legs
      const lowerGroup = new THREE.Group();
      lowerGroup.position.set(0, 0.78, 0.15);
  
      const pelvis = new THREE.Mesh(new THREE.BoxGeometry(shoulderWidth * 0.95, 0.17, 0.26), gownMat);
      pelvis.position.set(0, 0.06, 0);
      lowerGroup.add(pelvis);
  
      [-0.11, 0.11].forEach(lx => {
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.054, 0.42, 14), skinMat);
        thigh.position.set(lx, 0.05, 0.30);
        thigh.rotation.x = Math.PI / 2;
        lowerGroup.add(thigh);
  
        const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.038, 0.40, 14), skinMat);
        calf.position.set(lx, 0.04, 0.68);
        calf.rotation.x = Math.PI / 2;
        lowerGroup.add(calf);
  
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.16, 0.055), skinMat);
        foot.position.set(lx, 0.09, 0.90);
        lowerGroup.add(foot);
      });
  
      const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.17, 0.78), blanketMat);
      blanket.position.set(0, 0.08, 0.42);
      blanket.castShadow = true;
      lowerGroup.add(blanket);
  
      this.patientRoot.add(lowerGroup);
    }
  
    loadCustomGLB(file, onSuccess, onError) {
      const url = URL.createObjectURL(file);
      const loader = new THREE.GLTFLoader();
      loader.load(
        url,
        gltf => {
          while (this.patientRoot.children.length > 0) {
            this.patientRoot.remove(this.patientRoot.children[0]);
          }
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1.75 / (maxDim || 1);
          model.scale.setScalar(scale);
          model.position.set(0, 0.78, 0);
          this.patientRoot.add(model);
          this.patientMeshes.chestGroup = model;
          if (onSuccess) onSuccess(file.name);
        },
        undefined,
        err => {
          if (onError) onError(err);
        }
      );
    }
  
    setCameraPreset(presetName) {
      const presets = {
        default: { pos: new THREE.Vector3(2.35, 2.05, 2.55), look: new THREE.Vector3(0, 0.88, 0) },
        head:    { pos: new THREE.Vector3(0.75, 1.65, -0.15), look: new THREE.Vector3(0, 1.25, -0.58) },
        chest:   { pos: new THREE.Vector3(0.95, 1.62, 0.35),  look: new THREE.Vector3(0, 1.05, -0.18) },
        arm:     { pos: new THREE.Vector3(1.15, 1.42, 0.35),  look: new THREE.Vector3(0.32, 0.92, -0.05) },
        monitor: { pos: new THREE.Vector3(-0.35, 1.55, 0.35), look: new THREE.Vector3(-0.88, 1.42, -0.58) }
      };
      const p = presets[presetName] || presets.default;
      this.camTargetPos = p.pos.clone();
      this.camTargetLook = p.look.clone();
    }
  
    _initHotspotsDOM() {
      this.hotspotsLayer.innerHTML = '';
      this.hotspotElements = this.hotspotsData.map(h => {
        const el = document.createElement('div');
        el.className = 'hotspot-pin';
        el.innerHTML = `<span class="hotspot-dot"></span><span>${h.label}</span>`;
        el.addEventListener('click', () => {
          this.setCameraPreset(h.cam);
          if (this.onHotspotClick) this.onHotspotClick(h);
        });
        this.hotspotsLayer.appendChild(el);
        return { data: h, el };
      });
    }
  
    updateFrame(elapsedSec, simState, currentCase) {
      // Smooth Camera Interpolation
      if (this.camTargetPos && this.camTargetLook) {
        this.camera.position.lerp(this.camTargetPos, 0.08);
        this.controls.target.lerp(this.camTargetLook, 0.08);
        if (this.camera.position.distanceTo(this.camTargetPos) < 0.02) {
          this.camTargetPos = null;
          this.camTargetLook = null;
        }
      }
      this.controls.update();
  
      // Dynamic Chest & Abdomen Respiratory Animation
      const breathFreq = (simState.vitals.rr / 60) * Math.PI * 2;
      const breathAmp = simState.vitals.rr > 24 ? 0.045 : 0.025;
      const breathWave = Math.sin(elapsedSec * breathFreq);
  
      if (this.patientMeshes.chestGroup) {
        this.patientMeshes.chestGroup.scale.y = 1 + breathWave * breathAmp;
      }
      if (this.patientMeshes.abdomenMesh) {
        this.patientMeshes.abdomenMesh.scale.y = 1 + Math.sin(elapsedSec * breathFreq - 0.5) * (breathAmp * 0.75);
      }
  
      // Rigors / Subtle Head Tremor when Febrile
      if (this.patientMeshes.headGroup && !simState.ended) {
        const rigors = simState.vitals.temp > 38.5 ? Math.sin(elapsedSec * 22) * 0.008 : 0;
        this.patientMeshes.headGroup.rotation.z = Math.sin(elapsedSec * 0.9) * 0.04 + rigors;
      }
  
      // Cyanosis / Ashen Skin Pallor Feedback
      if (this.patientMeshes.skinMaterials.length > 0) {
        const baseColor = new THREE.Color(currentCase.skinHex);
        const pallorColor = new THREE.Color(0x475569);
        const mapVal = (simState.vitals.sbp + 2 * simState.vitals.dbp) / 3;
        const hypoxiaFactor = Math.max(0, (92 - simState.vitals.spo2) / 18);
        const shockFactor = Math.max(0, (65 - mapVal) / 30);
        const blend = Math.min(0.55, (hypoxiaFactor + shockFactor) * 0.35);
        this.patientMeshes.skinMaterials[0].color.copy(baseColor).lerp(pallorColor, blend);
      }
  
      // Update 2D Projected Anatomical Hotspots
      this.hotspotElements.forEach(({ data, el }) => {
        const v = data.pos.clone().project(this.camera);
        if (v.z > 1) {
          el.style.display = 'none';
        } else {
          const x = (v.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;
          el.style.display = 'flex';
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
        }
      });
  
      this.renderer.render(this.scene, this.camera);
    }
  
    _onResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }
  
  window.MedSimScene3D = MedSimScene3D;