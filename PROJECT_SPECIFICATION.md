# Fire Emergency Occupant Localization and Responder System
### Complete Project Compilation — Idea, Technical Design, and Academic Synopsis

---

## 1. Problem Statement (Original, as given by teacher)

In a building fire, there is no way to identify who is on what floor, and every second is critical. Occupants should be able to send a distress signal that indicates not just "help," but *where* — including floor/altitude. The building's WiFi Access Points (APs) can help: signal strength is stronger near an AP, weaker further away. Two harder cases must also be handled:

- A person sends a distress signal, then faints — how do we still know where they are?
- A person never sends any signal at all (fainted from smoke before they could act) — can we detect this using real-time data on who is/isn't connected to an AP?

---

## 2. Why This Matters (Motivation)

In a fire, the biggest problem isn't just "there's a fire" — it's not knowing where people are. Firefighters search blind, floor by floor, under time pressure. Every minute spent searching an empty floor is a minute not spent where someone actually needs help. Existing fire safety systems (smoke detectors, sprinklers, alarms) detect the fire but give zero occupant-location information. Modern smartphones already carry the sensors needed (barometer, WiFi radio, accelerometer), and buildings already run WiFi infrastructure and badge-in systems for unrelated purposes — creating a real opportunity to combine existing data sources into a real-time rescue tool, without new specialized hardware.

---

## 3. Key Concepts, Explained Simply

- **RSSI (Received Signal Strength Indicator)**: Signal strength in dBm (-40 to -90). Closer to 0 = stronger/closer.
- **AP (Access Point)**: WiFi router/box phone connects to.
- **Barometer**: Smartphone sensor measuring air pressure (~12 Pa drop per meter height).
- **Trilateration**: Geometry-based intersection of distance circles from 3+ APs.
- **Fingerprinting**: Comparing live RSSI readings against a pre-surveyed grid map of the floor.
- **Heartbeat**: Background periodic telemetry ping (`device_id`, pressure, RSSI).
- **Occupancy Roster**: Expected building occupants from badge-in/out logs.
- **Identity Binding**: Enrolled linkage between person identity and device ID.

---

## 4. Complete Architecture & Scenario

### 4 Layers:
1. **Ingestion Layer**: Persistent WebSocket/MQTT telemetry from phone heartbeat background service + WiFi controller event stream (connect/disconnect).
2. **Processing Layer**:
   - Vertical: Barometer reading vs Lobby Reference Sensor $\rightarrow \Delta P \rightarrow$ Height $\rightarrow$ Floor.
   - Horizontal: Filtered fingerprint nearest-neighbor search within active floor $\rightarrow (x,y) \rightarrow$ Room Polygon matching.
   - Status Classifier: `normal`, `active_sos`, `signal_lost`, `unaccounted`, `ap_down`, `evacuated`.
3. **State Store**: Redis (live in-memory `floor → room → [devices]`) + PostgreSQL (roster, floorplans, survey fingerprints).
4. **Delivery Layer**: Real-time push via WebSockets to Fire Command Center (FCC) touch panel and mobile responder backup.

---

## 5. Mathematical Formulations

### Vertical Localization (Barometric Altimetry)
$$\Delta P = P_{\text{ref}} - P_{\text{device}}$$
$$\text{Height } h = \frac{\Delta P}{12 \text{ Pa/m}}$$
$$\text{Floor} = \left\lfloor \frac{h}{h_{\text{floor}}} \right\rfloor$$

### Horizontal Localization (Trilateration / Log-Distance Path Loss)
$$\text{RSSI} = -10 \cdot n \cdot \log_{10}(d) + A$$
$$d = 10^{\frac{A - \text{RSSI}}{10n}}$$

### Fingerprinting (k-NN / Euclidean Metric in Signal Space)
$$D_j = \sqrt{\sum_{i=1}^{M} (\text{RSSI}_{\text{live}, i} - \text{RSSI}_{\text{survey}, i, j})^2}$$

---

## 6. Academic Synopsis Draft (RBU Format)
*Complete synopsis with Literature Review, Research Gap table, Methodology, Tech Stack, Scope, Timeline, and References included in project documentation.*
