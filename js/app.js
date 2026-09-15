/**
 * FIRE COMMAND CENTER — OPERATOR DASHBOARD CONTROLLER
 * Refactored to senior-dev enterprise safety standard (Axon / Rekor / Enterprise B2B).
 * Calm, information-dense, collision-free blueprint rendering, proportional severity cards.
 */

document.addEventListener("DOMContentLoaded", () => {
    const engine = window.engine;
    let selectedOccupant = engine.occupants[0]; // Lead occupant by default
    let isDraggingOccupant = false;

    // DOM Elements
    const canvas = document.getElementById("floorplanCanvas");
    const ctx = canvas.getContext("2d");

    // Summary Card Elements
    const cardExpected = document.getElementById("cardExpected");
    const cardSafe = document.getElementById("cardSafe");
    const cardSos = document.getElementById("cardSos");
    const cardLost = document.getElementById("cardLost");
    const cardUnaccounted = document.getElementById("cardUnaccounted");

    const countExpected = document.getElementById("countExpected");
    const countSafe = document.getElementById("countSafe");
    const countSos = document.getElementById("countSos");
    const countLost = document.getElementById("countLost");
    const countUnaccounted = document.getElementById("countUnaccounted");
    const subSos = document.getElementById("subSos");
    const subLost = document.getElementById("subLost");

    // Structural Containers
    const buildingLevelsList = document.getElementById("buildingLevelsList");
    const occupantStreamList = document.getElementById("occupantStreamList");
    const activeFloorTitleBadge = document.getElementById("activeFloorTitleBadge");
    const topClockVal = document.getElementById("topClockVal");
    const topRefBaroVal = document.getElementById("topRefBaroVal");
    const topApHealthVal = document.getElementById("topApHealthVal");
    const btnEmergencyMode = document.getElementById("btnEmergencyMode");
    const emergencyModeBtnText = document.getElementById("emergencyModeBtnText");
    const headerSystemDot = document.getElementById("headerSystemDot");

    // Phone Simulator Elements
    const phoneClock = document.getElementById("phoneClock");
    const phoneBaroVal = document.getElementById("phoneBaroVal");
    const phoneFloorEst = document.getElementById("phoneFloorEst");
    const simPressureSlider = document.getElementById("simPressureSlider");
    const simPressureSliderVal = document.getElementById("simPressureSliderVal");
    const phoneSosBtn = document.getElementById("phoneSosBtn");
    const phoneCancelGraceBox = document.getElementById("phoneCancelGraceBox");
    const phoneGraceCountdown = document.getElementById("phoneGraceCountdown");
    const btnCancelSos = document.getElementById("btnCancelSos");

    // Diagnostics Drawer Elements
    const diagName = document.getElementById("diagName");
    const diagBaro = document.getElementById("diagBaro");
    const diagFloor = document.getElementById("diagFloor");
    const diagRoom = document.getElementById("diagRoom");
    const diagHeartbeat = document.getElementById("diagHeartbeat");
    const diagMac = document.getElementById("diagMac");

    // Math Lab Elements
    const calcPref = document.getElementById("calcPref");
    const calcPdev = document.getElementById("calcPdev");
    const resDeltaP = document.getElementById("resDeltaP");
    const resHeight = document.getElementById("resHeight");
    const resFloor = document.getElementById("resFloor");
    const mathFingerprintTbody = document.getElementById("mathFingerprintTbody");

    // Roster & Toggles
    const rosterTableBody = document.getElementById("rosterTableBody");
    const rosterSearch = document.getElementById("rosterSearch");
    const toggleApCoverage = document.getElementById("toggleApCoverage");
    const toggleSurveyGrid = document.getElementById("toggleSurveyGrid");

    let graceCountdownInterval = null;

    // ==================== 1. SUMMARY CARDS (SEVERITY PROPORTIONAL) ====================
    function renderSummaryCards() {
        const summary = engine.getTriageSummary();

        countExpected.textContent = summary.totalExpected;
        countSafe.textContent = summary.safe;
        countSos.textContent = summary.activeSos;
        countLost.textContent = summary.signalLost;
        countUnaccounted.textContent = summary.unaccounted;

        // Active SOS Card
        if (summary.activeSos > 0) {
            cardSos.classList.remove("is-zero");
            cardSos.classList.add("is-active-emergency");
            subSos.textContent = `Floor ${selectedOccupant.floor} • ${selectedOccupant.roomName}`;
            subSos.style.color = "var(--status-sos)";
        } else {
            cardSos.classList.add("is-zero");
            cardSos.classList.remove("is-active-emergency");
            subSos.textContent = "No active alarms";
            subSos.style.color = "var(--text-tertiary)";
        }

        // Signal Lost (Fainted) Card
        if (summary.signalLost > 0) {
            cardLost.classList.remove("is-zero");
            cardLost.classList.add("is-active-emergency");
            subLost.textContent = "Immediate rescue priority";
            subLost.style.color = "var(--status-lost)";
        } else {
            cardLost.classList.add("is-zero");
            cardLost.classList.remove("is-active-emergency");
            subLost.textContent = "0 devices offline";
            subLost.style.color = "var(--text-tertiary)";
        }

        // Unaccounted Card
        if (summary.unaccounted > 0) {
            cardUnaccounted.classList.remove("is-zero");
            cardUnaccounted.classList.add("is-active-warning");
        } else {
            cardUnaccounted.classList.add("is-zero");
            cardUnaccounted.classList.remove("is-active-warning");
        }
    }

    // ==================== 2. FLOOR LIST SIDEBAR (NO BADGE NOISE) ====================
    function renderFloorListSidebar() {
        buildingLevelsList.innerHTML = "";
        engine.floors.forEach(fl => {
            const row = document.createElement("div");
            const isSelected = fl.floor === engine.activeFloor;
            row.className = `floor-row ${isSelected ? "selected" : ""} ${fl.hasEmergency ? "has-alert" : ""}`;

            // Check if any occupant on this floor has SOS or Lost status
            const activeOnFloor = engine.occupants.filter(o => o.floor === fl.floor && (o.status === "ACTIVE_SOS" || o.status === "SIGNAL_LOST"));
            const hasAlert = activeOnFloor.length > 0 || fl.hasEmergency;

            row.innerHTML = `
                <div class="floor-name-wrap">
                    <div class="floor-primary-title">${fl.floor === 0 ? "Ground Floor" : `Floor ${fl.floor}`}</div>
                    <div class="floor-sub-desc">${fl.name.split("—")[1] || fl.name}</div>
                </div>
                ${hasAlert ? `<span class="floor-alert-indicator">${activeOnFloor.length > 0 ? `${activeOnFloor.length} SOS` : "ALERT"}</span>` : ""}
            `;

            row.addEventListener("click", () => {
                engine.activeFloor = fl.floor;
                activeFloorTitleBadge.textContent = `Floor ${fl.floor}`;
                renderFloorListSidebar();
                drawArchitecturalBlueprint();
            });

            buildingLevelsList.appendChild(row);
        });
    }

    // ==================== 3. TRIAGE FEED (2-LINE SCANNER) ====================
    function renderTriageFeed() {
        occupantStreamList.innerHTML = "";
        
        // Priority Sort: SIGNAL_LOST -> ACTIVE_SOS -> UNACCOUNTED -> NORMAL -> SAFELY_EVACUATED
        const priorityOrder = { "SIGNAL_LOST": 1, "ACTIVE_SOS": 2, "UNACCOUNTED": 3, "NORMAL_INSIDE": 4, "SAFELY_EVACUATED": 5 };
        const sorted = [...engine.occupants].sort((a, b) => priorityOrder[a.status] - priorityOrder[b.status]);

        sorted.slice(0, 12).forEach(occ => {
            const card = document.createElement("div");
            card.className = `triage-occupant-card status-${occ.status.toLowerCase()} ${selectedOccupant && selectedOccupant.id === occ.id ? "selected" : ""}`;

            let badgeClass = "badge-normal";
            let badgeLabel = "NORMAL";
            if (occ.status === "ACTIVE_SOS") { badgeClass = "badge-sos"; badgeLabel = "DISTRESS"; }
            else if (occ.status === "SIGNAL_LOST") { badgeClass = "badge-lost"; badgeLabel = "SIGNAL LOST"; }
            else if (occ.status === "UNACCOUNTED") { badgeClass = "badge-unacc"; badgeLabel = "UNACCOUNTED"; }
            else if (occ.status === "SAFELY_EVACUATED") { badgeClass = "badge-normal"; badgeLabel = "EVACUATED"; }

            // Clean 2-Line Architecture:
            // Line 1: Name & Role | Status Tag
            // Line 2: Floor & Room | Heartbeat timestamp
            card.innerHTML = `
                <div class="card-top-line">
                    <span class="occupant-name">${occ.name}</span>
                    <span class="occupant-status-badge ${badgeClass}">${badgeLabel}</span>
                </div>
                <div class="card-bottom-line">
                    <span class="loc-text">Fl ${occ.floor} • ${occ.roomName}</span>
                    <span class="hb-text">${occ.isHeartbeatActive ? `${occ.lastHeartbeatSecAgo}s ago` : "Offline"}</span>
                </div>
            `;

            card.addEventListener("click", () => {
                selectOccupant(occ);
            });

            occupantStreamList.appendChild(card);
        });
    }

    // ==================== 4. ARCHITECTURAL BLUEPRINT CANVAS ====================
    function drawArchitecturalBlueprint() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // A. Subtle Structural CAD Grid
        ctx.strokeStyle = "rgba(148, 163, 184, 0.04)";
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // B. Architectural Room Boundaries (Thin 1px Slate Borders, Corner Labels)
        engine.roomsF4.forEach(r => {
            ctx.fillStyle = r.isExit ? "rgba(16, 185, 129, 0.06)" : "rgba(30, 41, 59, 0.4)";
            ctx.strokeStyle = r.isExit ? "#10b981" : "#334155";
            ctx.lineWidth = 1;
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeRect(r.x, r.y, r.w, r.h);

            // Clean Room Label in Top-Left Corner with Padding (Zero Collision with Floor Center)
            ctx.fillStyle = r.isExit ? "#10b981" : "#94a3b8";
            ctx.font = "600 11px 'Inter', sans-serif";
            ctx.fillText(r.name, r.x + 10, r.y + 18);
        });

        // C. WiFi AP Coverage Radii (Subtle)
        if (toggleApCoverage.checked) {
            engine.accessPoints.forEach(ap => {
                if (ap.isOnline) {
                    ctx.beginPath();
                    ctx.arc(ap.x, ap.y, ap.radius, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(56, 189, 248, 0.03)";
                    ctx.fill();
                    ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 3]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            });
        }

        // D. Calibration Grid Nodes (Optional Layer)
        if (toggleSurveyGrid.checked) {
            engine.surveyGridF4.forEach(fp => {
                ctx.beginPath();
                ctx.arc(fp.x, fp.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = "#475569";
                ctx.fill();
            });
        }

        // E. WiFi AP Nodes (Clean Radio Antenna Glyph)
        engine.accessPoints.forEach(ap => {
            ctx.beginPath();
            ctx.arc(ap.x, ap.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = ap.isOnline ? "#0284c7" : "#475569";
            ctx.fill();
            ctx.strokeStyle = "#0f172a";
            ctx.lineWidth = 2;
            ctx.stroke();

            // AP Label positioned cleanly above marker
            ctx.fillStyle = ap.isOnline ? "#38bdf8" : "#ef4444";
            ctx.font = "500 10px 'JetBrains Mono'";
            ctx.fillText(ap.id, ap.x - 18, ap.y - 10);
        });

        // F. Occupant Pins (Single Crisp Dot per Status, Zero Overlap)
        engine.occupants.forEach(occ => {
            if (occ.floor === engine.activeFloor && occ.status !== "SAFELY_EVACUATED") {
                const isSelected = selectedOccupant && selectedOccupant.id === occ.id;
                
                // Single crisp marker dot
                ctx.beginPath();
                ctx.arc(occ.x, occ.y, 6, 0, Math.PI * 2);

                if (occ.status === "ACTIVE_SOS") ctx.fillStyle = "#ef4444";
                else if (occ.status === "SIGNAL_LOST") ctx.fillStyle = "#dc2626";
                else if (occ.status === "UNACCOUNTED") ctx.fillStyle = "#f59e0b";
                else ctx.fillStyle = "#64748b";

                ctx.fill();
                ctx.strokeStyle = isSelected ? "#ffffff" : "#0f172a";
                ctx.lineWidth = isSelected ? 2 : 1.5;
                ctx.stroke();

                // Name label with offset padding
                ctx.fillStyle = isSelected ? "#ffffff" : "#cbd5e1";
                ctx.font = isSelected ? "600 11px 'Inter'" : "500 10px 'Inter'";
                ctx.fillText(occ.name.split("(")[0].trim(), occ.x + 10, occ.y + 4);
            }
        });
    }

    // ==================== 5. SELECTION & DIAGNOSTICS DRAWER ====================
    function selectOccupant(occ) {
        selectedOccupant = occ;
        
        const deltaP = (engine.referencePressurePa - occ.rawPressurePa).toFixed(1);
        const estH = (deltaP / engine.paPerMeter).toFixed(2);

        diagName.textContent = `${occ.name} (${occ.role})`;
        diagBaro.textContent = `${occ.rawPressurePa.toFixed(1)} Pa (ΔP: ${deltaP} Pa)`;
        diagFloor.textContent = `Floor ${occ.floor} (${estH}m)`;
        diagRoom.textContent = `${occ.roomName}`;
        diagHeartbeat.textContent = occ.isHeartbeatActive ? `Active (${occ.lastHeartbeatSecAgo}s ago)` : "Frozen (Ceased)";
        diagMac.textContent = occ.deviceId;

        renderTriageFeed();
        drawArchitecturalBlueprint();
        updateMathLab();
    }

    // ==================== 6. PHONE SIMULATOR ====================
    function updatePhoneUI() {
        const pDev = parseFloat(simPressureSlider.value);
        const alt = engine.calculateFloorFromPressure(pDev);

        simPressureSliderVal.textContent = `${pDev.toLocaleString()} Pa (Floor ${alt.floor})`;
        phoneBaroVal.textContent = `${pDev.toLocaleString()} Pa`;
        phoneFloorEst.textContent = `${alt.heightMeters}m (Floor ${alt.floor})`;
    }

    simPressureSlider.addEventListener("input", () => {
        updatePhoneUI();
        if (selectedOccupant) {
            selectedOccupant.rawPressurePa = parseFloat(simPressureSlider.value);
            const alt = engine.calculateFloorFromPressure(selectedOccupant.rawPressurePa);
            selectedOccupant.floor = alt.floor;
            renderSummaryCards();
            renderTriageFeed();
            drawArchitecturalBlueprint();
            updateMathLab();
        }
    });

    phoneSosBtn.addEventListener("click", () => {
        selectedOccupant.status = "ACTIVE_SOS";
        selectedOccupant.isHeartbeatActive = true;
        phoneCancelGraceBox.classList.remove("hidden");
        
        let sec = 5;
        phoneGraceCountdown.textContent = `${sec}s`;
        if (graceCountdownInterval) clearInterval(graceCountdownInterval);
        graceCountdownInterval = setInterval(() => {
            sec--;
            if (sec > 0) phoneGraceCountdown.textContent = `${sec}s`;
            else {
                clearInterval(graceCountdownInterval);
                phoneCancelGraceBox.classList.add("hidden");
            }
        }, 1000);

        renderSummaryCards();
        renderTriageFeed();
        selectOccupant(selectedOccupant);
    });

    btnCancelSos.addEventListener("click", () => {
        if (graceCountdownInterval) clearInterval(graceCountdownInterval);
        phoneCancelGraceBox.classList.add("hidden");
        selectedOccupant.status = "NORMAL_INSIDE";
        renderSummaryCards();
        renderTriageFeed();
        selectOccupant(selectedOccupant);
    });

    document.getElementById("btnSimFall").addEventListener("click", () => {
        phoneSosBtn.click();
    });

    document.getElementById("btnSimFaint").addEventListener("click", () => {
        selectedOccupant.status = "SIGNAL_LOST";
        selectedOccupant.isHeartbeatActive = false;
        renderSummaryCards();
        renderTriageFeed();
        selectOccupant(selectedOccupant);
    });

    document.getElementById("btnSimEvacuate").addEventListener("click", () => {
        let p = selectedOccupant.rawPressurePa;
        const target = 101325.0;
        const sInt = setInterval(() => {
            p += 36.0;
            if (p >= target) {
                p = target;
                clearInterval(sInt);
                selectedOccupant.status = "SAFELY_EVACUATED";
                selectedOccupant.floor = 0;
                selectedOccupant.roomName = "Ground Muster Zone";
            } else {
                selectedOccupant.rawPressurePa = p;
                const alt = engine.calculateFloorFromPressure(p);
                selectedOccupant.floor = alt.floor;
                selectedOccupant.roomName = `East Stairwell (Fl ${alt.floor})`;
            }
            simPressureSlider.value = p;
            updatePhoneUI();
            renderSummaryCards();
            renderTriageFeed();
            drawArchitecturalBlueprint();
        }, 1000);
    });

    // ==================== 7. MATH LAB ====================
    function updateMathLab() {
        const pRef = parseFloat(calcPref.value) || 101325;
        const pDev = parseFloat(calcPdev.value) || 101181;
        const deltaP = pRef - pDev;
        const height = deltaP / 12.0;
        const floor = Math.max(0, Math.round(height / 3.0));

        resDeltaP.textContent = `${deltaP.toFixed(1)} Pa`;
        resHeight.textContent = `${height.toFixed(2)} meters`;
        resFloor.textContent = `Floor ${floor}`;

        const match = engine.matchFingerprint(selectedOccupant.liveRssi);
        mathFingerprintTbody.innerHTML = "";
        match.allScored.forEach((fp, i) => {
            const tr = document.createElement("tr");
            if (i === 0) tr.style.background = "rgba(59, 130, 246, 0.1)";
            tr.innerHTML = `
                <td style="padding: 4px;">${fp.id} (${fp.room.split("(")[0]})</td>
                <td style="padding: 4px;">${fp.rssi["AP_4_1"] || -95}</td>
                <td style="padding: 4px;">${fp.rssi["AP_4_2"] || -95}</td>
                <td style="padding: 4px;">${fp.rssi["AP_4_3"] || -95}</td>
                <td style="padding: 4px;">${fp.dist.toFixed(2)}</td>
                <td style="padding: 4px; font-weight: 600;">${i === 0 ? "Match (Rank 1)" : `#${i + 1}`}</td>
            `;
            mathFingerprintTbody.appendChild(tr);
        });
    }

    [calcPref, calcPdev].forEach(el => el.addEventListener("input", updateMathLab));

    // ==================== 8. ROSTER TABLE ====================
    function renderRosterTable(query = "") {
        rosterTableBody.innerHTML = "";
        const q = query.toLowerCase();

        engine.occupants.forEach(occ => {
            if (occ.name.toLowerCase().includes(q) || occ.id.toLowerCase().includes(q)) {
                const tr = document.createElement("tr");
                tr.style.borderBottom = "1px solid var(--border-subtle)";
                tr.innerHTML = `
                    <td style="padding: 6px; font-family: var(--font-mono); font-size: 11px;">${occ.id}</td>
                    <td style="padding: 6px; font-weight: 500;">${occ.name}</td>
                    <td style="padding: 6px; color: var(--text-secondary); font-size: 11px;">${occ.badgeInTime}</td>
                    <td style="padding: 6px; font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">${occ.deviceId}</td>
                    <td style="padding: 6px;">Fl ${occ.floor} • ${occ.roomName}</td>
                    <td style="padding: 6px;"><span class="occupant-status-badge ${occ.status === 'ACTIVE_SOS' ? 'badge-sos' : 'badge-normal'}">${occ.status}</span></td>
                `;
                rosterTableBody.appendChild(tr);
            }
        });
    }

    rosterSearch.addEventListener("input", (e) => renderRosterTable(e.target.value));

    // ==================== 9. SCENARIOS ====================
    document.getElementById("scBtnFireAlarm").addEventListener("click", () => {
        engine.isEmergencyMode = true;
        btnEmergencyMode.classList.add("active");
        btnEmergencyMode.innerHTML = "🚨 Emergency Active";
        headerSystemDot.className = "status-dot dot-alert";
        switchTab("tab-fcc");
    });

    document.getElementById("scBtnSosPersonA").addEventListener("click", () => {
        const pA = engine.occupants[0];
        pA.status = "ACTIVE_SOS";
        pA.floor = 4;
        pA.roomName = "Room 4B (Conference Hall)";
        pA.x = 480;
        pA.y = 110;
        pA.isHeartbeatActive = true;
        selectOccupant(pA);
        renderSummaryCards();
        renderTriageFeed();
        drawArchitecturalBlueprint();
        switchTab("tab-fcc");
    });

    document.getElementById("scBtnFaintPersonA").addEventListener("click", () => {
        const pA = engine.occupants[0];
        pA.status = "SIGNAL_LOST";
        pA.isHeartbeatActive = false;
        selectOccupant(pA);
        renderSummaryCards();
        renderTriageFeed();
        drawArchitecturalBlueprint();
        switchTab("tab-fcc");
    });

    document.getElementById("scBtnSilentPersonB").addEventListener("click", () => {
        const pB = engine.occupants[1];
        pB.status = "UNACCOUNTED";
        selectOccupant(pB);
        renderSummaryCards();
        renderTriageFeed();
        drawArchitecturalBlueprint();
        switchTab("tab-fcc");
    });

    document.getElementById("scBtnApFailure").addEventListener("click", () => {
        const ap12 = engine.accessPoints.find(ap => ap.id === "AP_4_EAST_12");
        if (ap12) ap12.isOnline = !ap12.isOnline;
        topApHealthVal.textContent = ap12 && !ap12.isOnline ? "5/6 (AP-12 Fault)" : "6/6 Online";
        drawArchitecturalBlueprint();
        switchTab("tab-fcc");
    });

    document.getElementById("scBtnEvacuatePersonC").addEventListener("click", () => {
        const pC = engine.occupants[2];
        pC.floor = 4;
        pC.x = 740;
        pC.y = 250;
        selectOccupant(pC);
        
        let cur = 4;
        const eInt = setInterval(() => {
            cur--;
            if (cur <= 0) {
                clearInterval(eInt);
                pC.status = "SAFELY_EVACUATED";
                pC.floor = 0;
                pC.roomName = "Ground Muster Zone";
            } else {
                pC.floor = cur;
                pC.roomName = `East Stairwell (Fl ${cur})`;
                pC.rawPressurePa = 101325.0 - (cur * 36.0);
            }
            renderSummaryCards();
            renderTriageFeed();
            drawArchitecturalBlueprint();
        }, 1200);

        switchTab("tab-fcc");
    });

    document.getElementById("scBtnResetAll").addEventListener("click", () => {
        engine.occupants = engine.generateRosterData();
        engine.accessPoints.forEach(ap => ap.isOnline = true);
        topApHealthVal.textContent = "6/6 Online";
        engine.isEmergencyMode = false;
        btnEmergencyMode.classList.remove("active");
        btnEmergencyMode.innerHTML = "🚨 Trigger Alarm";
        headerSystemDot.className = "status-dot";
        selectedOccupant = engine.occupants[0];
        renderSummaryCards();
        renderFloorListSidebar();
        renderTriageFeed();
        selectOccupant(selectedOccupant);
        updatePhoneUI();
        updateMathLab();
        renderRosterTable();
        drawArchitecturalBlueprint();
    });

    // ==================== 10. TABS & INTERACTION ====================
    const tabBtns = document.querySelectorAll(".tab-btn");
    const viewPanes = document.querySelectorAll(".view-pane");

    function switchTab(tabId) {
        tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
        viewPanes.forEach(p => p.classList.toggle("active", p.id === tabId));
        if (tabId === "tab-fcc") drawArchitecturalBlueprint();
    }

    tabBtns.forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
    [toggleApCoverage, toggleSurveyGrid].forEach(tg => tg.addEventListener("change", drawArchitecturalBlueprint));

    // Pointer Interaction on Canvas (Clean Drag & Reposition)
    function handleCanvasPointer(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = Math.round((e.clientX - rect.left) * scaleX);
        const clickY = Math.round((e.clientY - rect.top) * scaleY);

        if (selectedOccupant && selectedOccupant.floor === engine.activeFloor) {
            selectedOccupant.x = clickX;
            selectedOccupant.y = clickY;
            selectedOccupant.liveRssi = engine.calculateRssiFromPosition(clickX, clickY);
            selectedOccupant.roomName = engine.getRoomFromCoordinates(clickX, clickY);

            selectOccupant(selectedOccupant);
            updatePhoneUI();
            drawArchitecturalBlueprint();
        }
    }

    canvas.addEventListener("mousedown", (e) => {
        isDraggingOccupant = true;
        handleCanvasPointer(e);
    });

    canvas.addEventListener("mousemove", (e) => {
        if (isDraggingOccupant) handleCanvasPointer(e);
    });

    window.addEventListener("mouseup", () => {
        isDraggingOccupant = false;
    });

    // Clock Interval
    setInterval(() => {
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];
        topClockVal.textContent = timeStr;
        phoneClock.textContent = timeStr.substring(0, 5);

        const jitter = (Math.random() - 0.5) * 0.4;
        topRefBaroVal.textContent = `${(101325.0 + jitter).toFixed(1)} Pa`;

        engine.occupants.forEach(o => {
            if (o.isHeartbeatActive) {
                o.lastHeartbeatSecAgo = parseFloat((o.lastHeartbeatSecAgo + 0.5).toFixed(1));
            }
        });

        renderTriageFeed();
    }, 1000);

    // Initial Render
    renderSummaryCards();
    renderFloorListSidebar();
    renderTriageFeed();
    selectOccupant(selectedOccupant);
    updatePhoneUI();
    updateMathLab();
    renderRosterTable();
    drawArchitecturalBlueprint();
});
