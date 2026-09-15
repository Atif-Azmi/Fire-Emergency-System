# Presentation Deck Script & Visual Storyboard
## Fire Emergency Occupant Localization and Responder Orchestration System
*Slide-by-Slide Script for 10-Minute Academic Project Presentation*

---

### Slide 1: Title & Introduction (1 Min)
- **Title**: Fire Emergency Occupant Localization and Responder Orchestration System
- **Subtitle**: Real-Time Barometric Floor Detection, WiFi Fingerprinting, and Occupancy Cross-Verification for Rescue Operations
- **Presenter**: Project Team
- **Key Talking Point**: "When firefighters arrive at a burning multi-storey building, their biggest enemy isn't just the fire—it's blind search. We are presenting an autonomous system that tells responders who is inside, on what floor, and in which room, even if victims have fainted or never touched their phones."

---

### Slide 2: The Core Problem & The 3 Critical Personas (1.5 Mins)
- **Visual**: 3 Personas Diagram (Conscious Caller vs Fainted Victim vs Silent Trapped Occupant).
- **Key Talking Points**:
  1. *Persona 1*: Conscious person presses SOS $\to$ needs vertical + horizontal coordinates immediately.
  2. *Persona 2*: Fainted victim $\to$ presses SOS, then suffocates. Current apps fail because the signal dies; our system freezes and flags their last known position as highest priority.
  3. *Persona 3*: Silent victim $\to$ never opened the app. Our system cross-verifies WiFi AP connection dropoffs against building badge-in logs to identify them.

---

### Slide 3: Why Existing Solutions Fall Short (1 Min)
- **Comparison Table**:
  - Smoke detectors locate the fire, not humans.
  - RFID badges only know you entered the building at 9:00 AM.
  - GPS cannot penetrate concrete and has zero vertical floor resolution.
  - BLE beacons require thousands of dollars of dedicated hardware that melts in a fire.
- **Our Edge**: We use sensors already in everyone's pocket (smartphones) and infrastructure already on the ceiling (enterprise WiFi APs).

---

### Slide 4: Vertical Localization — The Barometric Altimetry Physics (1.5 Mins)
- **Visual**: Lobby Reference Sensor ($101,325\text{ Pa}$) vs 4th Floor Phone ($101,181\text{ Pa}$).
- **Formula**: $\Delta P = P_{\text{ref}} - P_{\text{dev}}$, $\text{Height} = \Delta P / 12\text{ Pa/m}$, $\text{Floor} = \lfloor h / 3.0\text{m} \rfloor$.
- **Key Defense**: "Why don't weather storms break this? Because our live ground reference sensor experiences the exact same atmospheric drift in real time, canceling out 100% of weather noise."

---

### Slide 5: Horizontal Localization — WiFi RSSI Fingerprinting (1.5 Mins)
- **Visual**: Floor Grid Survey map + k-NN Euclidean distance matching + Room Boundary Polygon test.
- **Key Talking Points**:
  - Why trilateration fails: walls distort indoor path loss exponent ($n$).
  - Fingerprinting bakes wall attenuation directly into pre-surveyed vectors.
  - Sub-second lookup: Barometer first isolates Floor 4, limiting the search space to Floor 4's fingerprint table.

---

### Slide 6: System Architecture & End-to-End Pipeline (1.5 Mins)
- **Visual**: 4-Tier Flow (Phone Heartbeat & AP Push $\to$ FastAPI/Node Processing Worker $\to$ Redis State Matrix $\to$ FCC Dashboard Push).
- **Latency**: Whole sense-to-display loop executes in $< 850\text{ms}$.
- **Resilience**: Zero queries during emergency; dashboard subscribes to pre-computed states.

---

### Slide 7: Live Prototype Demonstration (1.5 Mins)
- **Actions to Demonstrate**:
  1. Trigger Fire Alarm $\to$ Dashboard auto-switches to high-contrast emergency mode.
  2. Person A presses SOS $\to$ Floor 4, Room 4B lights up with live coordinates.
  3. Simulate Person A fainting $\to$ Heartbeat stops $\to$ Status transitions to `SIGNAL LOST` (pulsing red priority).
  4. Simulate AP-12 cut $\to$ System detects AP failure rather than false-evacuation, while identifying Person B as `UNACCOUNTED`.

---

### Slide 8: Conclusion & Future Scope (0.5 Min)
- **Summary**: Delivered a working multi-floor localization and emergency response ecosystem requiring zero specialized building hardware.
- **Future Work**: Integration with municipal CAD (Computer-Aided Dispatch) systems and building HVAC smoke extraction zoning.
- **Closing**: "Thank you. We are now open for technical questions."
