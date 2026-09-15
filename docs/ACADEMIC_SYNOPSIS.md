# Ramdeobaba University — Project Synopsis
## School of Computer Science and Engineering / CSE

---

### 1. Title of the Project
**FIRE EMERGENCY OCCUPANT LOCALIZATION AND RESPONDER ORCHESTRATION SYSTEM**
*A Real-Time Barometric Floor Detection, WiFi-Based Room-Level Positioning, and Occupancy Cross-Verification Ecosystem for Building Fire Rescue Response*

---

### 1. Background and Motivation
In cases where there is a fire outbreak in a multi-story building, emergency teams often find themselves entering the building without much knowledge about the situation inside the building. They do not know whether there are any people in the building, which floor they are in and where they are. Due to this reason, firefighters often have to conduct a search from one floor to another, while doing it blindfolded within a very tight schedule. Fire safety systems such as smoke detectors, sprinklers and alarms are very effective when it comes to notifying about fire. The main problem here is that they notify the building about the fire but provide no information about the location of the people in the building, especially those who are unconscious, injured or are not able to notify on their own.

Moreover, almost everyone today owns a smartphone, which has all sorts of sensors that can detect location as well as estimate the floor number. Additionally, almost every commercial building is equipped with active Wi-Fi network and digital badge system for signing in. In other words, we have enough data sources for mapping the location of the occupants of the building in real time, without requiring new specialized hardware.

---

### 2. Problem Statement
Rescue personnel cannot accurately find out the number of occupants, the floor they are in, or their precise location in the building during a fire incident. This is true even for conscious occupants because of the lack of a proper channel to relay this information to rescue personnel. The same challenge becomes even more complicated if an occupant loses his consciousness or does not get the opportunity to alert anyone about himself. Current fire alarms can only sense smoke and heat without being able to communicate any occupant information to the rescue personnel. It is thus necessary to develop a solution that can precisely identify an occupant's floor and level in the building and communicate his last known location in case of lost communication or no communication at all using an existing building network infrastructure.

---

### 3. Objectives
- **The development of a floor level (vertical) localization algorithm** for building occupants based on smartphone barometric pressure readings that are calibrated against a reference barometric pressure sensor installed to negate pressure variations due to weather changes.
- **The creation of a room level (horizontal) positioning algorithm** within the confines of a floor based on WiFi RSSI fingerprinting algorithm relative to a digitized floor plan where each room is defined in coordinates.
- **The implementation of a background heartbeat algorithm** which ensures continuous reporting of occupant device information so that in case of any unresponsive occupant or one whose device is out of connection mid-emergency, the system can maintain its last known position.
- **The design of a backend solution** which correlates live WiFi access points connected against a list of occupants to find out individuals who have not sent any distress signal at all.
- **The design of a responder dashboard** which shows occupant status (active distress, signal lost, unaccounted and safe evacuation) at both floor and room levels without necessitating live query during an emergency.
- **The evaluation of the feasibility, limitations and accuracy** of the system based on a prototype.

---

### 4. Literature Review and Research Gap
In recent research on indoor emergency tracking systems, the main approaches are Wi-Fi signal fingerprinting, barometer measurement, and sensor fusion techniques. The study by Bahl and Padmanabhan [1] proposed RADAR technique which showed the ability to track 2D indoor locations through Wi-Fi signals; however, interference from the environment still occurs. In order to address the problem of vertical positioning, Kim et al. [2] used barometers in smartphones along with baseline reference station to detect floors. However, horizontal room location is not addressed by this approach. Cola et al. [3] implemented sensor fusion of Wi-Fi signals and inertial sensors by using step counts to track the responders; however, position drift is quick in this case without any manual resets. Hybrid Bluetooth and Wi-Fi beacons were investigated by Khan et al. [4]; however, the system depends on heavy installations which can be destroyed by fire. More recently, Neto et al. [5] implemented passive Wi-Fi signal collection to count the missing persons by logging their connection records; this method addresses the presence of person in the building but not the specific room information.

#### Literature Review Table

| Sr. No. | Author(s) & Year | Title / Focus | Methodology / Key Contribution | Limitation / Gap |
|---|---|---|---|---|
| 1 | Bahl & Padmanabhan (2000) | RADAR: In-Building User Location and Tracking | RF-based RSSI fingerprinting and signal propagation modeling for 2D indoor positioning. | Susceptible to environmental signal fluctuations; lacks 3D floor resolution. |
| 2 | Kim et al. (2018) | Barometric Pressure-based Floor Identification | Smartphone barometer usage with baseline differential calibration for vertical height tracking. | Only handles vertical floor determination; no horizontal room-level localization. |
| 3 | Cola et al. (2021) | First Responder Inertial Tracking & Sensor Fusion | Pedestrian Dead Reckoning (PDR) combined with periodic WiFi RSSI updates for responder path tracking. | Accumulates drift over extended movement; requires active user movement for calibration. |
| 4 | Khan et al. (2022) | BLE and WiFi Beacon Hybrid Emergency System | Dense deployment of Bluetooth Low Energy (BLE) beacons mapped to room boundaries for occupant safety. | Requires extensive dedicated hardware installation vulnerable to fire damage. |
| 5 | Neto et al. (2024) | Passive Connection Logging Evacuation Accounting | WiFi Monitors for router association logs against organizational rosters to count missing individuals. | Provides general building presence only; lacks granular floor/room coordinates and heartbeat resilience. |

**Research Gap:** Though prior studies have looked at particular techniques for indoor tracking separately (like barometer-based height tracking, Wi-Fi fingerprinting or connection logging), a comprehensive solution which makes use of drift-calibrated vertical floor identification and horizontal room level identification through existing commercial building architecture does not exist. Besides, present-day studies have not adequately addressed the problem of accounting for silent or unresponsive individuals during emergencies without physical hardware setup.

---

### 5. Proposed Methodology / Plan of Work
The system operates in an ongoing fashion **sense $\to$ merge $\to$ process** flow, rather than only activating in case of emergency.

- **Sensing (on the device):** An application that runs in the background, registered to the occupant during setup, periodically sends two pieces of data: barometric pressure (for floor location) and Wi-Fi signal strengths (for room location). In normal situations, it sends the data every 30 to 60 seconds to conserve battery, but when an alarm goes off, it automatically increases to every 5 to 10 seconds.
- **Floor detection:** A fixed reference barometer is installed on the first floor/lobby to compensate for weather-related pressure changes. The difference between the reading of a phone and the reference barometer gives relative altitude, allowing the floor location to be determined ($\Delta P / 12\text{ Pa/m}$).
- **Room-level detection:** Each floor is surveyed in advance by using a simple grid of Wi-Fi signal strengths at access points. Live Wi-Fi signals of a phone are matched against this grid ($k$-NN in signal space), which provides coordinates that can be compared against room boundaries on a floor plan.
- **Presence verification:** The backend system combines the heartbeat from the app, active Wi-Fi connections list, and sign-in log in the building to categorize every registered occupant as safe, experiencing distress, missing, or unknown even if they don't press the distress button.
- **Delivery:** Since the process of data manipulation is constantly happening behind the scenes, the dashboard on the Fire Command Center gets updated immediately through push notifications, without any delays or intensive database searches in case of an emergency.

**Plan of work:** Literature review and requirement collection; digitization of sample floor plans and room limits; implementation of the barometer and Wi-Fi location logic; development of the backend status processor; creation of the mobile heartbeat application and dashboard; and integration testing in a multilevel testbed with sample access points.

---

### 6. Technology, Tools and Platforms
- **Mobile:** Android (Kotlin/Java) for the SOS heartbeat app, using built-in barometer and WiFi RSSI APIs.
- **Backend:** Python (FastAPI/Standard Library) or Node.js, with Redis for live in-memory state and PostgreSQL for the roster, fingerprint tables, and room boundary data.
- **Prototype Hardware:** ESP32/Raspberry Pi boards as access point stand-ins, BMP280 barometer modules, OpenWrt firmware for AP client-list access.
- **Frontend:** React / Modern Vanilla Web Components for the responder dashboard with WebSocket/REST push updates.
- **Datasets:** Self-collected RSSI fingerprint survey data and a digitized sample floor plan.

---

### 7. Expected Outcomes, Deliverables and Functional Specifications
This project will produce a working prototype that is capable of floor level identification through barometric floor sensing using reference sensor calibration in an environment where multiple floors are present, such as a stairwell. This will include a room level estimation method using Wi-Fi fingerprints against digital floor maps. This will be accompanied by a back-end component which combines heartbeat readings, live Wi-Fi readings, and list of entrances in order to classify occupants' status whether normal, out-of-signal range, in active distress, or missing. The results will be displayed in a live dashboard accessible by first responders.

---

### 8. Project Scope
The project concentrates on the development and prototyping of a real-time occupancy monitoring system for fires in commercial or institutional tall buildings that have Wi-Fi and electronic sign-in infrastructure already in place. The scope of work includes barometric-based floor positioning, Wi-Fi-based room positioning, and back-end software to detect missing or silent occupants, based on a small scale test setup (2–3 floors with small number of devices and access points). Building-wide implementation, fire-based testing, commercial Wi-Fi hardware integration (mocked with OpenWrt) and cellular backup systems are out of the scope of the project and will be done in further development.

---

### 9. Project Timeline

| Phase | Duration | Milestone / Deliverable |
|---|---|---|
| Literature review & requirement analysis | Week 1 – 2 | Finalized problem scope, reviewed literature, identified research gap |
| Design & methodology finalisation | Week 3 – 4 | Digitized sample floor plan, defined room boundaries, finalized system architecture |
| Implementation / development | Week 5 – 9 | Working barometer floor-detection module, RSSI fingerprinting logic, backend merge/status pipeline, dashboard prototype |
| Testing & evaluation | Week 10 – 12 | Multi-floor testbed validation, accuracy evaluation, documented failure cases |
| Documentation & final submission | Week 13 – 14 | Final report, presentation, and project synopsis submission |

---

### 10. References
[1] P. Bahl and V. N. Padmanabhan, "RADAR: An in-building RF-based user location and tracking system," in *Proc. IEEE INFOCOM*, 2000, pp. 775–784.  
[2] S.-S. Kim, J.-W. Kim, and D.-S. Han, "Floor detection using a barometer sensor in a smartphone," in *Proc. Int. Conf. Indoor Positioning and Indoor Navigation (IPIN)*, 2018.  
[3] G. Cola, M. Avvenuti, P. Piazza, and A. Vecchio, "First responder inertial tracking and sensor fusion," in *Proc. IEEE Trans. Human-Machine Systems*, 2021.  
[4] S. Khan, S. S. Faiz, and A. M. As Samee, "BLE and WiFi beacon hybrid emergency system," 2022.  
[5] J. Neto, A. J. Morais, et al., "Passive connection logging evacuation accounting," *Electronics*, 2024.
