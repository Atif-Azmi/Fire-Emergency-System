/**
 * FIRE RESCUE SYSTEM - MASTER UI CONTROLLER & CANVAS RENDERER
 * Orchestrates real-time 2D floorplan rendering, Web Audio siren synthesizer,
 * phone sensor simulator, interactive math lab, and presentation demo scenarios.
 */

document.addEventListener("DOMContentLoaded", () => {
    const engine = window.engine;
    let selectedOccupant = engine.occupants[0]; // Person A by default
    let isAudioMuted = false;
    let audioContext = null;
    let graceCountdownInterval = null;
    let graceSeconds = 5;

    // Canvas Elements
    const canvas = document.getElementById("floorplanCanvas");
    const ctx = canvas.getContext("2d");

    // UI Elements
    const triageRibbon = document.getElementById("triageRibbon");
    const countExpected = document.getElementById("countExpected");
    const countSafe = document.getElementById("countSafe");
    const countSos = document.getElementById("countSos");
    const countLost = document.getElementById("countLost");
    const countUnaccounted = document.getElementById("countUnaccounted");
    const buildingLevelsList = document.getElementById("buildingLevelsList");
    const occupantStreamList = document.getElementById("occupantStreamList");
    const occupantInspector = document.getElementById("occupantInspector");
    const inspectorDetails = document.getElementById("inspectorDetails");
    const inspectorEmpty = document.getElementById("inspectorEmpty");
    const topClockVal = document.getElementById("topClockVal");
    const topRefBaroVal = document.getElementById("topRefBaroVal");
    const topApHealthVal = document.getElementById("topApHealthVal");
    const btnEmergencyMode = document.getElementById("btnEmergencyMode");
    const emergencyModeBtnText = document.getElementById("emergencyModeBtnText");
    const systemHeartbeatDot = document.getElementById("systemHeartbeatDot");
    const btnToggleAudio = document.getElementById("btnToggleAudio");
    const audioIcon = document.getElementById("audioIcon");

    // Phone UI Elements
    const phoneClock = document.getElementById("phoneClock");
    const phoneBaroVal = document.getElementById("phoneBaroVal");
    const phoneFloorEst = document.getElementById("phoneFloorEst");
    const phoneHeartbeatCadence = document.getElementById("phoneHeartbeatCadence");
    const phoneSosBtn = document.getElementById("phoneSosBtn");
    const phoneCancelGraceBox = document.getElementById("phoneCancelGraceBox");
    const phoneGraceCountdown = document.getElementById("phoneGraceCountdown");
    const btnCancelSos = document.getElementById("btnCancelSos");
    const phoneEmergencyBanner = document.getElementById("phoneEmergencyBanner");
    const simPressureSlider = document.getElementById("simPressureSlider");
    const simPressureSliderVal = document.getElementById("simPressureSliderVal");
    const phoneApScanBars = document.getElementById("phoneApScanBars");
    const phoneWifiIcon = document.getElementById("phoneWifiIcon");
    const phoneCellularIcon = document.getElementById("phoneCellularIcon");

    // Math Lab Elements
    const calcPref = document.getElementById("calcPref");
    const calcPdev = document.getElementById("calcPdev");
    const calcFloorH = document.getElementById("calcFloorH");
    const resDeltaP = document.getElementById("resDeltaP");
    const resHeight = document.getElementById("resHeight");
    const resFloor = document.getElementById("resFloor");
    const mathFingerprintTbody = document.getElementById("mathFingerprintTbody");

    // Roster Elements
    const rosterTableBody = document.getElementById("rosterTableBody");
    const rosterSearch = document.getElementById("rosterSearch");

    // Modal
    const modalGraceCancel = document.getElementById("modalGraceCancel");
    const modalGraceTimer = document.getElementById("modalGraceTimer");
    const btnModalCancelSos = document.getElementById("btnModalCancelSos");

    // Canvas Layers Toggles
    const toggleApCoverage = document.getElementById("toggleApCoverage");
    const toggleSurveyGrid = document.getElementById("toggleSurveyGrid");
    const toggleHeatmap = document.getElementById("toggleHeatmap");

    // ==================== 1. AUDIO SYNTHESIZER (WEB AUDIO API) ====================
    function initAudio() {
        if (!audioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContextClass();
        }
    }

    function playBeep(freq = 880, type = "sine", duration = 0.15) {
        if (isAudioMuted) return;
        try {
            initAudio();
            if (audioContext.state === "suspended") audioContext.resume();
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioContext.currentTime);
            gain.gain.setValueAtTime(0.15, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start();
            osc.stop(audioContext.currentTime + duration);
        } catch (e) {
            console.warn("Audio context not allowed yet:", e);
        }
    }

    function playSiren() {
        if (isAudioMuted) return;
        playBeep(920, "sawtooth", 0.4);
        setTimeout(() => playBeep(640, "sawtooth", 0.4), 400);
    }

    btnToggleAudio.addEventListener("click", () => {
        isAudioMuted = !isAudioMuted;
        btnToggleAudio.innerHTML = isAudioMuted ? `<span class="icon">🔇</span> Audio: MUTED` : `<span class="icon">🔊</span> Audio: ON`;
        if (!isAudioMuted) playBeep(1000, "sine", 0.1);
    });

    // ==================== 2. REAL-TIME CLOCK & LIVE BACKEND POLLING ====================
    async function syncWithBackend() {
        try {
            const res = await fetch("/api/status");
            if (res.ok) {
                const data = await res.json();
                
                if (data.is_emergency_active && !engine.isEmergencyMode) {
                    engine.isEmergencyMode = true;
                    btnEmergencyMode.classList.add("active");
                    btnEmergencyMode.innerHTML = `<span class="icon">🚨</span> EMERGENCY ACTIVE`;
                    systemHeartbeatDot.className = "pulse-indicator status-emergency";
                    playSiren();
                }

                if (data.server_ip) {
                    const mobileUrlElem = document.getElementById("topMobileConnectUrl");
                    if (mobileUrlElem) mobileUrlElem.textContent = `http://${data.server_ip}:8080`;
                }

                // Render live synced metrics
                if (data.total_expected_in_building !== undefined) {
                    countExpected.textContent = data.total_expected_in_building;
                    countSos.textContent = data.active_sos ? data.active_sos.length : 0;
                    countLost.textContent = data.signal_lost ? data.signal_lost.length : 0;
                    countUnaccounted.textContent = data.unaccounted ? data.unaccounted.length : 0;
                    countSafe.textContent = data.safely_evacuated ? data.safely_evacuated.length : 0;
                }
            }
        } catch (e) {
            // Offline fallback
        }
    }

    setInterval(() => {
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];
        topClockVal.textContent = timeStr;
        phoneClock.textContent = timeStr.substring(0, 5);

        // Realistic barometric jitter (0.1 to 0.3 Pa) on reference
        const jitter = (Math.random() - 0.5) * 0.4;
        const currentRef = (101325.0 + jitter).toFixed(1);
        topRefBaroVal.textContent = `${currentRef} Pa`;

        // Update heartbeat timer counters
        engine.occupants.forEach(o => {
            if (o.isHeartbeatActive) {
                o.lastHeartbeatSecAgo = parseFloat((o.lastHeartbeatSecAgo + 0.5).toFixed(1));
            }
        });

        syncWithBackend();
        renderOccupantStream();
    }, 1000);

    // ==================== 3. CANVAS 2D BLUEPRINT RENDERER ====================
    function drawFloorplan() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // A. Draw Subtle Blueprint Grid
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // B. Draw Architectural Rooms
        engine.roomsF4.forEach(r => {
            ctx.fillStyle = r.fill;
            ctx.strokeStyle = r.stroke;
            ctx.lineWidth = 2;
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeRect(r.x, r.y, r.w, r.h);

            // Room Name Label
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.font = "bold 13px 'Outfit', sans-serif";
            ctx.fillText(r.name, r.x + 12, r.y + 24);

            // Bounding Box Coordinates (Matches Digitized Blueprint in Synopsis)
            ctx.fillStyle = "rgba(140, 155, 181, 0.65)";
            ctx.font = "10px 'JetBrains Mono', monospace";
            ctx.fillText(`Grid Bounds: [${r.x},${r.y}] -> [${r.x + r.w},${r.y + r.h}]`, r.x + 12, r.y + 40);

            // Exit Zone Styling
            if (r.isExit) {
                ctx.fillStyle = "rgba(6, 214, 160, 0.8)";
                ctx.font = "bold 11px 'Outfit', sans-serif";
                ctx.fillText("🟢 PRIMARY EVACUATION ROUTE", r.x + 12, r.y + r.h - 14);
            }
        });

        // C. Draw WiFi AP Coverage Radii
        if (toggleApCoverage.checked) {
            engine.accessPoints.forEach(ap => {
                if (ap.isOnline) {
                    ctx.beginPath();
                    ctx.arc(ap.x, ap.y, ap.radius, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(58, 134, 255, 0.05)";
                    ctx.fill();
                    ctx.strokeStyle = "rgba(58, 134, 255, 0.25)";
                    ctx.setLineDash([4, 4]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            });
        }

        // D. Draw Survey Fingerprint Grid Nodes
        if (toggleSurveyGrid.checked) {
            engine.surveyGridF4.forEach(fp => {
                ctx.beginPath();
                ctx.arc(fp.x, fp.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(0, 240, 255, 0.6)";
                ctx.fill();
                ctx.fillStyle = "rgba(0, 240, 255, 0.4)";
                ctx.font = "9px 'JetBrains Mono'";
                ctx.fillText(fp.id, fp.x + 6, fp.y - 4);
            });
        }

        // E. Draw Access Point Nodes
        engine.accessPoints.forEach(ap => {
            ctx.beginPath();
            ctx.arc(ap.x, ap.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = ap.isOnline ? "#3a86ff" : "#555";
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Label
            ctx.fillStyle = ap.isOnline ? "#00f0ff" : "#ff2a4b";
            ctx.font = "bold 11px 'JetBrains Mono'";
            ctx.fillText(ap.isOnline ? `📡 ${ap.id}` : `⚠️ ${ap.id} (OFFLINE)`, ap.x - 20, ap.y - 14);
        });

        // F. Draw Occupants on Active Floor (Floor 4)
        engine.occupants.forEach(occ => {
            if (occ.floor === engine.activeFloor && occ.status !== "SAFELY_EVACUATED") {
                const isSelected = selectedOccupant && selectedOccupant.id === occ.id;
                
                // Outer Pulse Ring
                if (occ.status === "ACTIVE_SOS" || occ.status === "SIGNAL_LOST") {
                    ctx.beginPath();
                    ctx.arc(occ.x, occ.y, 18, 0, Math.PI * 2);
                    ctx.strokeStyle = occ.status === "ACTIVE_SOS" ? "rgba(255, 42, 75, 0.6)" : "rgba(217, 4, 41, 0.8)";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Core Pin
                ctx.beginPath();
                ctx.arc(occ.x, occ.y, 8, 0, Math.PI * 2);
                
                if (occ.status === "ACTIVE_SOS") ctx.fillStyle = "#ff2a4b";
                else if (occ.status === "SIGNAL_LOST") ctx.fillStyle = "#ff0055";
                else if (occ.status === "UNACCOUNTED") ctx.fillStyle = "#ff9f1c";
                else ctx.fillStyle = "#00f0ff";
                
                ctx.fill();
                ctx.strokeStyle = isSelected ? "#fff" : "#000";
                ctx.lineWidth = isSelected ? 3 : 1.5;
                ctx.stroke();

                // Name Tag Tag
                ctx.fillStyle = "#fff";
                ctx.font = "bold 11px 'Outfit'";
                ctx.fillText(occ.name, occ.x + 12, occ.y + 4);

                // Status Mini Badge
                ctx.font = "9px 'JetBrains Mono'";
                if (occ.status === "ACTIVE_SOS") {
                    ctx.fillStyle = "#ff2a4b";
                    ctx.fillText("SOS (ACTIVE)", occ.x + 12, occ.y + 16);
                } else if (occ.status === "SIGNAL_LOST") {
                    ctx.fillStyle = "#ff0055";
                    ctx.fillText("SIGNAL LOST (FAINTED)", occ.x + 12, occ.y + 16);
                } else if (occ.status === "UNACCOUNTED") {
                    ctx.fillStyle = "#ff9f1c";
                    ctx.fillText("UNACCOUNTED (SILENT)", occ.x + 12, occ.y + 16);
                }
            }
        });
    }

    // ==================== 4. UI COMPONENT RENDERING ====================
    function renderTriageRibbon() {
        const summary = engine.getTriageSummary();
        countExpected.textContent = summary.totalExpected;
        countSafe.textContent = summary.safe;
        countSos.textContent = summary.activeSos;
        countLost.textContent = summary.signalLost;
        countUnaccounted.textContent = summary.unaccounted;
    }

    function renderBuildingStack() {
        buildingLevelsList.innerHTML = "";
        engine.floors.forEach(fl => {
            const card = document.createElement("div");
            card.className = `level-card ${fl.floor === engine.activeFloor ? "selected" : ""} ${fl.hasFire ? "has-emergency" : ""}`;
            
            let badgeClass = "badge-safe";
            let badgeText = "NORMAL";
            if (fl.hasFire) {
                badgeClass = "badge-danger";
                badgeText = "FIRE / SOS";
            }

            card.innerHTML = `
                <div class="level-info">
                    <div class="level-name">
                        <span>${fl.floor === 0 ? "GROUND LOBBY" : `FLOOR ${fl.floor}`}</span>
                        ${fl.hasFire ? "🔥" : ""}
                    </div>
                    <div class="level-stats">${fl.name}</div>
                </div>
                <span class="level-badge ${badgeClass}">${badgeText}</span>
            `;

            card.addEventListener("click", () => {
                engine.activeFloor = fl.floor;
                document.getElementById("activeFloorTitleBadge").textContent = `FLOOR ${fl.floor}`;
                renderBuildingStack();
                drawFloorplan();
            });

            buildingLevelsList.appendChild(card);
        });
    }

    function renderOccupantStream() {
        occupantStreamList.innerHTML = "";
        
        // Sort priority: SIGNAL_LOST -> ACTIVE_SOS -> UNACCOUNTED -> NORMAL
        const priorityMap = { "SIGNAL_LOST": 1, "ACTIVE_SOS": 2, "UNACCOUNTED": 3, "NORMAL_INSIDE": 4, "SAFELY_EVACUATED": 5 };
        const sorted = [...engine.occupants].sort((a, b) => priorityMap[a.status] - priorityMap[b.status]);

        sorted.slice(0, 10).forEach(occ => {
            const card = document.createElement("div");
            card.className = `occ-card status-${occ.status.toLowerCase()}`;
            
            let statusTagClass = "tag-safe";
            let statusTagText = occ.status;
            if (occ.status === "ACTIVE_SOS") { statusTagClass = "tag-sos"; statusTagText = "ACTIVE SOS"; }
            else if (occ.status === "SIGNAL_LOST") { statusTagClass = "tag-lost"; statusTagText = "SIGNAL LOST"; }
            else if (occ.status === "UNACCOUNTED") { statusTagClass = "tag-unacc"; statusTagText = "UNACCOUNTED"; }

            card.innerHTML = `
                <div class="occ-card-head">
                    <span class="occ-name">${occ.name}</span>
                    <span class="occ-status-tag ${statusTagClass}">${statusTagText}</span>
                </div>
                <div class="occ-location-row">
                    Location: <strong>Floor ${occ.floor} &bull; ${occ.roomName}</strong>
                </div>
                <div class="occ-telemetry-row">
                    <span>${occ.rawPressurePa ? `${occ.rawPressurePa.toFixed(0)} Pa` : "No Baro"}</span>
                    <span>${occ.isHeartbeatActive ? `Heartbeat: ${occ.lastHeartbeatSecAgo}s ago` : "📴 Disconnected"}</span>
                </div>
            `;

            card.addEventListener("click", () => {
                selectOccupant(occ);
            });

            occupantStreamList.appendChild(card);
        });
    }

    function selectOccupant(occ) {
        selectedOccupant = occ;
        inspectorEmpty.classList.add("hidden");
        inspectorDetails.classList.remove("hidden");

        const deltaP = (engine.referencePressurePa - occ.rawPressurePa).toFixed(1);
        const estH = (deltaP / engine.paPerMeter).toFixed(2);

        inspectorDetails.innerHTML = `
            <div class="inspector-grid">
                <div class="insp-item">
                    <span class="insp-k">OCCUPANT / ROLE</span>
                    <span class="insp-v">${occ.name} (${occ.role})</span>
                </div>
                <div class="insp-item">
                    <span class="insp-k">DEVICE / MAC</span>
                    <span class="insp-v">${occ.deviceId}</span>
                </div>
                <div class="insp-item">
                    <span class="insp-k">BARO PRESSURE (DEV)</span>
                    <span class="insp-v">${occ.rawPressurePa.toFixed(1)} Pa (&Delta;P: ${deltaP} Pa)</span>
                </div>
                <div class="insp-item">
                    <span class="insp-k">RESOLVED HEIGHT & FLOOR</span>
                    <span class="insp-v">${estH}m &rarr; FLOOR ${occ.floor}</span>
                </div>
                <div class="insp-item">
                    <span class="insp-k">WIFI MATCHED ROOM</span>
                    <span class="insp-v">${occ.roomName} [${occ.x}, ${occ.y}]</span>
                </div>
                <div class="insp-item">
                    <span class="insp-k">HEARTBEAT TELEMETRY</span>
                    <span class="insp-v">${occ.isHeartbeatActive ? `ACTIVE (${occ.lastHeartbeatSecAgo}s ago)` : `STOPPED (FROZEN)`}</span>
                </div>
            </div>
        `;

        drawFloorplan();
    }

    // ==================== 5. PHONE SIMULATOR LOGIC ====================
    function updatePhoneUI() {
        const pDev = parseFloat(simPressureSlider.value);
        const altimetry = engine.calculateFloorFromPressure(pDev);
        
        simPressureSliderVal.textContent = `${pDev.toLocaleString()} Pa (Floor ${altimetry.floor})`;
        phoneBaroVal.textContent = `${pDev.toLocaleString()} Pa`;
        phoneFloorEst.textContent = `Est. Altitude: ${altimetry.heightMeters}m (Floor ${altimetry.floor})`;

        // Render phone scan list
        phoneApScanBars.innerHTML = "";
        engine.accessPoints.forEach(ap => {
            if (ap.isOnline) {
                const rssi = selectedOccupant.liveRssi[ap.id] || -85;
                const percent = Math.min(100, Math.max(10, (rssi + 100) * 1.6));
                
                const row = document.createElement("div");
                row.className = "ap-bar-row";
                row.innerHTML = `
                    <span>${ap.id} (${rssi} dBm)</span>
                    <div class="ap-signal-meter">
                        <div class="meter-fill" style="width: ${percent}%;"></div>
                    </div>
                `;
                phoneApScanBars.appendChild(row);
            }
        });
    }

    simPressureSlider.addEventListener("input", () => {
        updatePhoneUI();
        if (selectedOccupant) {
            selectedOccupant.rawPressurePa = parseFloat(simPressureSlider.value);
            const altimetry = engine.calculateFloorFromPressure(selectedOccupant.rawPressurePa);
            selectedOccupant.floor = altimetry.floor;
            renderOccupantStream();
            drawFloorplan();
            updateMathLab();
        }
    });

    phoneSosBtn.addEventListener("click", () => {
        triggerOccupantSos();
    });

    function triggerOccupantSos() {
        playBeep(1200, "square", 0.3);
        selectedOccupant.status = "ACTIVE_SOS";
        selectedOccupant.isHeartbeatActive = true;
        phoneEmergencyBanner.classList.remove("hidden");
        phoneCancelGraceBox.classList.remove("hidden");
        
        // Start 5s false alarm countdown
        graceSeconds = 5;
        phoneGraceCountdown.textContent = `${graceSeconds}s`;
        if (graceCountdownInterval) clearInterval(graceCountdownInterval);
        
        graceCountdownInterval = setInterval(() => {
            graceSeconds--;
            if (graceSeconds > 0) {
                phoneGraceCountdown.textContent = `${graceSeconds}s`;
                playBeep(800, "sine", 0.08);
            } else {
                clearInterval(graceCountdownInterval);
                phoneCancelGraceBox.classList.add("hidden");
                playSiren();
            }
        }, 1000);

        renderTriageRibbon();
        renderOccupantStream();
        selectOccupant(selectedOccupant);
        drawFloorplan();
    }

    btnCancelSos.addEventListener("click", () => {
        cancelSosGrace();
    });

    function cancelSosGrace() {
        if (graceCountdownInterval) clearInterval(graceCountdownInterval);
        phoneCancelGraceBox.classList.add("hidden");
        modalGraceCancel.classList.add("hidden");
        selectedOccupant.status = "NORMAL_INSIDE";
        playBeep(440, "sine", 0.2);
        renderTriageRibbon();
        renderOccupantStream();
        selectOccupant(selectedOccupant);
        drawFloorplan();
    }

    // Phone simulator action buttons
    document.getElementById("btnSimFall").addEventListener("click", () => {
        // Jolt + baro drop
        playBeep(1500, "sawtooth", 0.2);
        modalGraceCancel.classList.remove("hidden");
        let modalTimer = 5;
        modalGraceTimer.textContent = modalTimer;
        
        const mInterval = setInterval(() => {
            modalTimer--;
            if (modalTimer > 0) {
                modalGraceTimer.textContent = modalTimer;
            } else {
                clearInterval(mInterval);
                modalGraceCancel.classList.add("hidden");
                triggerOccupantSos();
            }
        }, 1000);

        btnModalCancelSos.onclick = () => {
            clearInterval(mInterval);
            cancelSosGrace();
        };
    });

    document.getElementById("btnSimFaint").addEventListener("click", () => {
        selectedOccupant.status = "SIGNAL_LOST";
        selectedOccupant.isHeartbeatActive = false;
        playBeep(300, "sawtooth", 0.5);
        renderTriageRibbon();
        renderOccupantStream();
        selectOccupant(selectedOccupant);
        drawFloorplan();
    });

    document.getElementById("btnSimCellular").addEventListener("click", () => {
        selectedOccupant.hasCellularFallback = !selectedOccupant.hasCellularFallback;
        phoneCellularIcon.classList.toggle("hidden", !selectedOccupant.hasCellularFallback);
        playBeep(700, "sine", 0.1);
    });

    document.getElementById("btnSimEvacuate").addEventListener("click", () => {
        // Step down floors
        let currentP = selectedOccupant.rawPressurePa;
        const targetP = 101325.0; // Ground
        const stepInterval = setInterval(() => {
            currentP += 36.0; // 1 floor down
            if (currentP >= targetP) {
                currentP = targetP;
                clearInterval(stepInterval);
                selectedOccupant.status = "SAFELY_EVACUATED";
                selectedOccupant.floor = 0;
                selectedOccupant.roomName = "Ground Exterior Muster Zone";
            } else {
                selectedOccupant.rawPressurePa = currentP;
                const alt = engine.calculateFloorFromPressure(currentP);
                selectedOccupant.floor = alt.floor;
                selectedOccupant.roomName = `East Stairwell (Fl ${alt.floor})`;
            }
            simPressureSlider.value = currentP;
            updatePhoneUI();
            renderTriageRibbon();
            renderOccupantStream();
            drawFloorplan();
        }, 1000);
    });

    // ==================== 6. MATHEMATICS LAB LOGIC ====================
    function updateMathLab() {
        const pRef = parseFloat(calcPref.value) || 101325;
        const pDev = parseFloat(calcPdev.value) || 101181;
        const fh = parseFloat(calcFloorH.value) || 3.0;

        const deltaP = pRef - pDev;
        const height = deltaP / 12.0;
        const floor = Math.max(0, Math.round(height / fh));

        resDeltaP.textContent = `${deltaP.toFixed(1)} Pa`;
        resHeight.textContent = `${height.toFixed(2)} meters`;
        resFloor.textContent = `FLOOR ${floor}`;

        // Fingerprint matching table
        const liveRssi = selectedOccupant.liveRssi;
        const matchResult = engine.matchFingerprint(liveRssi);

        mathFingerprintTbody.innerHTML = "";
        matchResult.allScored.forEach((fp, idx) => {
            const tr = document.createElement("tr");
            if (idx === 0) tr.className = "matched-row";

            tr.innerHTML = `
                <td>${fp.id} (${fp.room})</td>
                <td>${fp.rssi["AP_4_1"] || -95}</td>
                <td>${fp.rssi["AP_4_2"] || -95}</td>
                <td>${fp.rssi["AP_4_3"] || -95}</td>
                <td>${fp.dist.toFixed(2)}</td>
                <td>${idx === 0 ? "🏆 1st (Best Match)" : `#${idx + 1}`}</td>
            `;
            mathFingerprintTbody.appendChild(tr);
        });
    }

    [calcPref, calcPdev, calcFloorH].forEach(el => el.addEventListener("input", updateMathLab));

    // ==================== 7. OCCUPANCY ROSTER TABLE ====================
    function renderRosterTable(query = "") {
        rosterTableBody.innerHTML = "";
        const q = query.toLowerCase();

        engine.occupants.forEach(occ => {
            if (
                occ.name.toLowerCase().includes(q) ||
                occ.id.toLowerCase().includes(q) ||
                occ.mac.toLowerCase().includes(q)
            ) {
                const tr = document.createElement("tr");
                let statusTagClass = "tag-safe";
                if (occ.status === "ACTIVE_SOS") statusTagClass = "tag-sos";
                else if (occ.status === "SIGNAL_LOST") statusTagClass = "tag-lost";
                else if (occ.status === "UNACCOUNTED") statusTagClass = "tag-unacc";

                tr.innerHTML = `
                    <td class="font-mono">${occ.id}</td>
                    <td><strong>${occ.name}</strong> <span class="text-muted">(${occ.role})</span></td>
                    <td class="font-mono">${occ.badgeInTime}</td>
                    <td class="font-mono">${occ.deviceId}</td>
                    <td class="font-mono text-muted">${occ.mac}</td>
                    <td>Floor ${occ.floor} &bull; ${occ.roomName}</td>
                    <td><span class="occ-status-tag ${statusTagClass}">${occ.status}</span></td>
                `;
                rosterTableBody.appendChild(tr);
            }
        });
    }

    rosterSearch.addEventListener("input", (e) => {
        renderRosterTable(e.target.value);
    });

    // ==================== 8. LIVE SCENARIO CONTROLLER ====================
    document.getElementById("scBtnFireAlarm").addEventListener("click", () => {
        engine.isEmergencyMode = true;
        btnEmergencyMode.classList.add("active");
        btnEmergencyMode.innerHTML = `<span class="icon">🚨</span> EMERGENCY ACTIVE`;
        systemHeartbeatDot.className = "pulse-indicator status-emergency";
        phoneEmergencyBanner.classList.remove("hidden");
        phoneHeartbeatCadence.textContent = "5.0s (Adaptive Fast)";
        playSiren();
        switchTab("tab-fcc");
    });

    document.getElementById("scBtnSosPersonA").addEventListener("click", () => {
        const pA = engine.occupants[0];
        pA.status = "ACTIVE_SOS";
        pA.floor = 4;
        pA.rawPressurePa = 101181.0;
        pA.roomName = "Room 4B (Conference Hall)";
        pA.x = 480;
        pA.y = 110;
        pA.isHeartbeatActive = true;
        selectOccupant(pA);
        renderTriageRibbon();
        renderOccupantStream();
        drawFloorplan();
        playBeep(1200, "square", 0.3);
        switchTab("tab-fcc");
    });

    document.getElementById("scBtnFaintPersonA").addEventListener("click", () => {
        const pA = engine.occupants[0];
        pA.status = "SIGNAL_LOST";
        pA.isHeartbeatActive = false;
        selectOccupant(pA);
        renderTriageRibbon();
        renderOccupantStream();
        drawFloorplan();
        playBeep(300, "sawtooth", 0.6);
        switchTab("tab-fcc");
    });

    document.getElementById("scBtnSilentPersonB").addEventListener("click", () => {
        const pB = engine.occupants[1];
        pB.status = "UNACCOUNTED";
        selectOccupant(pB);
        renderTriageRibbon();
        renderOccupantStream();
        drawFloorplan();
        playBeep(600, "sawtooth", 0.4);
        switchTab("tab-fcc");
    });

    document.getElementById("scBtnApFailure").addEventListener("click", () => {
        const ap12 = engine.accessPoints.find(ap => ap.id === "AP_4_EAST_12");
        if (ap12) ap12.isOnline = !ap12.isOnline;
        topApHealthVal.textContent = ap12 && !ap12.isOnline ? "5/6 (AP-12 DOWN)" : "6/6 ONLINE";
        topApHealthVal.className = ap12 && !ap12.isOnline ? "pill-val color-crimson" : "pill-val color-green";
        drawFloorplan();
        playBeep(500, "square", 0.3);
        switchTab("tab-fcc");
    });

    document.getElementById("scBtnEvacuatePersonC").addEventListener("click", () => {
        const pC = engine.occupants[2];
        pC.floor = 4;
        pC.x = 740;
        pC.y = 250;
        selectOccupant(pC);
        
        let curFloor = 4;
        const eInt = setInterval(() => {
            curFloor--;
            if (curFloor <= 0) {
                clearInterval(eInt);
                pC.status = "SAFELY_EVACUATED";
                pC.floor = 0;
                pC.roomName = "Ground Exterior Muster Zone";
            } else {
                pC.floor = curFloor;
                pC.roomName = `East Stairwell (Descending Fl ${curFloor})`;
                pC.rawPressurePa = 101325.0 - (curFloor * 36.0);
            }
            renderTriageRibbon();
            renderOccupantStream();
            drawFloorplan();
        }, 1200);

        switchTab("tab-fcc");
    });

    document.getElementById("scBtnResetAll").addEventListener("click", () => {
        engine.occupants = engine.generateRosterData();
        engine.accessPoints.forEach(ap => ap.isOnline = true);
        topApHealthVal.textContent = "6/6 ONLINE";
        topApHealthVal.className = "pill-val color-green";
        engine.isEmergencyMode = false;
        btnEmergencyMode.classList.remove("active");
        btnEmergencyMode.innerHTML = `<span class="icon">🚨</span> TRIGGER EMERGENCY`;
        systemHeartbeatDot.className = "pulse-indicator status-live";
        selectedOccupant = engine.occupants[0];
        renderTriageRibbon();
        renderBuildingStack();
        renderOccupantStream();
        selectOccupant(selectedOccupant);
        updatePhoneUI();
        updateMathLab();
        renderRosterTable();
        drawFloorplan();
        playBeep(880, "sine", 0.1);
    });

    // Emergency Toggle in Header
    btnEmergencyMode.addEventListener("click", () => {
        engine.isEmergencyMode = !engine.isEmergencyMode;
        if (engine.isEmergencyMode) {
            btnEmergencyMode.classList.add("active");
            btnEmergencyMode.innerHTML = `<span class="icon">🚨</span> EMERGENCY ACTIVE`;
            systemHeartbeatDot.className = "pulse-indicator status-emergency";
            playSiren();
        } else {
            btnEmergencyMode.classList.remove("active");
            btnEmergencyMode.innerHTML = `<span class="icon">🚨</span> TRIGGER EMERGENCY`;
            systemHeartbeatDot.className = "pulse-indicator status-live";
        }
    });

    // ==================== 9. TAB SWITCHING LOGIC ====================
    const navTabs = document.querySelectorAll(".nav-tab");
    const tabPanes = document.querySelectorAll(".tab-pane");

    function switchTab(tabId) {
        navTabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
        tabPanes.forEach(p => p.classList.toggle("active", p.id === tabId));
        if (tabId === "tab-fcc") drawFloorplan();
    }

    navTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            switchTab(tab.dataset.tab);
        });
    });

    // Canvas Layers Toggles
    [toggleApCoverage, toggleSurveyGrid, toggleHeatmap].forEach(tg => {
        tg.addEventListener("change", drawFloorplan);
    });

    // Canvas click & drag to move and recalculate occupant in real-time
    let isDraggingOccupant = false;

    function handleCanvasPointer(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = Math.round((e.clientX - rect.left) * scaleX);
        const clickY = Math.round((e.clientY - rect.top) * scaleY);

        if (selectedOccupant && selectedOccupant.floor === engine.activeFloor) {
            selectedOccupant.x = clickX;
            selectedOccupant.y = clickY;
            // Calculate real-time RSSIs based on distance to each AP
            selectedOccupant.liveRssi = engine.calculateRssiFromPosition(clickX, clickY);
            selectedOccupant.roomName = engine.getRoomFromCoordinates(clickX, clickY);

            selectOccupant(selectedOccupant);
            updatePhoneUI();
            updateMathLab();
            drawFloorplan();
        }
    }

    canvas.addEventListener("mousedown", (e) => {
        isDraggingOccupant = true;
        handleCanvasPointer(e);
        playBeep(950, "sine", 0.05);
    });

    canvas.addEventListener("mousemove", (e) => {
        if (isDraggingOccupant) {
            handleCanvasPointer(e);
        }
    });

    window.addEventListener("mouseup", () => {
        isDraggingOccupant = false;
    });

    // ==================== INITIALIZE MASTER SUITE ====================
    renderTriageRibbon();
    renderBuildingStack();
    renderOccupantStream();
    selectOccupant(selectedOccupant);
    updatePhoneUI();
    updateMathLab();
    renderRosterTable();
    drawFloorplan();
});
