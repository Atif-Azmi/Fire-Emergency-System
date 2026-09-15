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

## 4. Complete Dual-Tier Architecture (Receiver-Centric)

The system operates on a **Receiver-Centric Dual-Tier Architecture** so that occupants do **NOT** strictly require an app:

### Tier 1: Zero-App Passive Tracking (Receiver End Only — No App Needed)
- Occupants simply walk into the building with standard smartphones.
- The building's WiFi Access Points passively detect connected MAC addresses and signal strength.
- The **Fire Command Center (Receiver Dashboard)** correlates AP client associations against building check-in logs.
- Responders immediately see which AP zone (e.g., *Floor 4, East Wing*) each person was last near, even if they have zero apps installed and never touched their phone.

### Tier 2: Precision Sensor-Enhanced Mode (For High-Precision Altimetry)
- Reads smartphone barometric pressure ($\Delta P$) and 3-axis accelerometer for sub-meter altitude resolution and automated fall detection.

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
