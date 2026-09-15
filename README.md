# 🔥 Fire Emergency Occupant Localization and Responder Orchestration System
### Complete Prototype, Backend Engine, Algorithms & Academic Defense Suite

---

## 🌟 Executive Summary
During structural building fires, firefighters face low visibility and have zero real-time intelligence on occupant locations. This system closes that gap by unifying:
1. **Vertical Localization (Floor)**: Differential Barometric Altimetry ($\pm 0.5$ floor resolution) with ground-reference drift cancellation.
2. **Horizontal Localization (Room)**: WiFi RSSI Fingerprinting ($k$-NN in signal space with pre-surveyed vectors, $3\text{--}8\text{m}$ accuracy).
3. **Continuous Background Telemetry**: Adaptive frequency heartbeats ($30\text{s}$ normal $\to 5\text{s}$ emergency).
4. **Passive Occupancy Reconciliation**: Merges building RFID badge-in logs with live AP connection events to catch fainted and silent trapped occupants.

---

## 🚀 How to Run the Prototype (Instant Demo)

### Method 1: Instant Browser Launch (Zero Installation Required)
Simply open **`index.html`** in any modern web browser (Chrome, Edge, Firefox, Safari).
- **Tactical Floorplan**: Interactive 2D architectural blueprint with real-time occupant pins, AP coverage circles, and fire/smoke origin.
- **2.5D Building Elevation**: 6 levels stacked (Floor 0 Ground Lobby to Floor 5 Penthouse) with emergency indicators.
- **Occupant Mobile SOS Simulator**: Interactive smartphone with live barometer slider, animated RSSI bars, 5-second false-alarm cancel grace countdown, and fall detection.
- **Mathematics & Signal Lab**: Live differential altimetry formulas and Euclidean distance matrix inspector.
- **Occupancy Roster**: Searchable 40-occupant database with RFID badge timestamps.
- **Live Demo Scenarios**: 1-click execution of Fire Alarm, Conscious SOS, Fainted victim signal loss, Silent trapped victim detection, and AP failure recovery.

### Method 2: Standalone Python Telemetry API Server (Optional)
Run the lightweight, zero-dependency Python REST/telemetry server:
```bash
python backend/server.py
```
API endpoints:
- `GET http://localhost:8080/api/status` : Full building triage summary
- `POST http://localhost:8080/api/telemetry/heartbeat` : Ingest phone telemetry
- `POST http://localhost:8080/api/telemetry/reference` : Update ground lobby reference sensor

---

## 📁 Repository Structure

```
IDEA_LAB01/
├── index.html                               # Master Tactical Fire Command Center & Simulator
├── css/
│   └── styles.css                           # Tactical Dark Theme & Glassmorphism HUD Styles
├── js/
│   ├── engine.js                            # Core Localization Physics & State Machine
│   └── app.js                               # Canvas 2D Renderer, Web Audio Synthesizer & Scenario Orchestrator
├── backend/
│   ├── server.py                            # Zero-dependency Python API & Ingestion Server
│   └── algorithms/
│       ├── barometer.py                     # Barometric Altimetry & EMA Filter Engine
│       ├── fingerprinting.py                # k-NN WiFi Fingerprinting & Polygon Bounds Matcher
│       ├── trilateration.py                 # Log-Distance Path Loss & 3-Circle Geometry Solver
│       └── roster_reconciler.py             # Badge-in / WiFi AP Event Reconciler
├── docs/
│   ├── ACADEMIC_SYNOPSIS.md                 # University-Formatted RBU Project Synopsis
│   ├── VIVA_QUESTIONS_AND_ANSWERS.md        # 30+ Tough Technical Defense & Examiner Q&As
│   ├── PRESENTATION_SLIDES.md               # 10-Minute Slide Deck Script & Visual Storyboard
│   └── HARDWARE_BOM_AND_SCHEMATICS.md       # ESP32 + BMP280 Wiring Schematics & Budget BOM
└── PROJECT_SPECIFICATION.md                 # Full Project Compilation & Architecture
```

---

## 🎯 5-Minute Presentation Demo Script for Tomorrow

1. **Step 1 — Baseline Status**:
   - Open `index.html`. Point to the top ribbon: *40 Expected In Building / 35 Confirmed Safe*.
   - Point to the Lobby Reference Barometer ($101,325.0\text{ Pa}$) and 6 Levels in the vertical elevation view.
2. **Step 2 — Trigger Fire Alarm (Scenario 1)**:
   - Click `Run Scenario 1` in the Live Scenario Suite.
   - Sirens sound, FCC header switches to glowing Crimson Red, Floor 4 lights up with active fire.
3. **Step 3 — Conscious SOS (Scenario 2)**:
   - Click `Run Scenario 2`. Person A (*Aamir Khan*) triggers SOS in Room 4B.
   - Show the differential altimetry calculation ($\Delta P = 144\text{ Pa} \to 12\text{m} \to \text{Floor 4}$) and WiFi fingerprint match.
4. **Step 4 — Fainted Victim Signal Loss (Scenario 3)**:
   - Click `Run Scenario 3`. Person A's heartbeat stops.
   - Point out that the system **freezes their last-known position** and transitions them to **`SIGNAL LOST`** with the highest rescue priority.
5. **Step 5 — Silent / Trapped Victim Detection (Scenario 4)**:
   - Click `Run Scenario 4`. Person B (*Priya Sharma*) never pressed SOS.
   - Explain how passive AP-to-roster reconciliation caught that her device dropped off `AP-12` while she was still badged in, flagging her as **`UNACCOUNTED`**.
6. **Step 6 — AP Power Failure Resilience (Scenario 5)**:
   - Click `Run Scenario 5`. AP-12 burns out.
   - System flags "AP-12 Down / Zone Unmonitored" instead of causing false-evacuation alarms.
