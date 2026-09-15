/**
 * FIRE RESCUE SYSTEM - SIMULATION & LOCALIZATION ENGINE
 * Implements client-side barometric altimetry, k-NN signal space fingerprinting,
 * Log-distance path loss, and occupancy state reconciliation.
 */

class SimulationEngine {
    constructor() {
        this.referencePressurePa = 101325.0; // Ground floor lobby reference
        this.floorHeightMeters = 3.0;
        this.paPerMeter = 12.0;
        this.isEmergencyMode = false;
        this.activeFloor = 4; // Default view floor

        // Building Floors (Ground Floor 0 up to Floor 10)
        this.floors = [
            { floor: 10, name: "10th Floor — Innovation Labs & Executive Suites", expected: 4, safe: 0, hasEmergency: false },
            { floor: 9, name: "9th Floor — Cloud Compute Infrastructure", expected: 3, safe: 0, hasEmergency: false },
            { floor: 8, name: "8th Floor — AI Research Center", expected: 4, safe: 0, hasEmergency: false },
            { floor: 7, name: "7th Floor — Cyber Security Division", expected: 4, safe: 0, hasEmergency: false },
            { floor: 6, name: "6th Floor — Data Science Wing", expected: 3, safe: 0, hasEmergency: false },
            { floor: 5, name: "5th Floor — Software Engineering Hub", expected: 5, safe: 0, hasEmergency: false },
            { floor: 4, name: "4th Floor — Research Labs & Server Wing", expected: 5, safe: 0, hasEmergency: false },
            { floor: 3, name: "3rd Floor — Mechanical & Robotics Labs", expected: 4, safe: 0, hasEmergency: false },
            { floor: 2, name: "2nd Floor — Administrative & HR Offices", expected: 4, safe: 0, hasEmergency: false },
            { floor: 1, name: "1st Floor — Classrooms & Auditorium", expected: 4, safe: 0, hasEmergency: false },
            { floor: 0, name: "Ground Floor — Lobby & Reference Station", expected: 0, safe: 0, hasEmergency: false },
        ];

        // Architectural Rooms for Floor 4 Blueprint (Canvas Coordinates in px, mapped to 30x30m grid)
        this.roomsF4 = [
            { id: "R4A", name: "Room 4A (Robotics Lab)", x: 40, y: 40, w: 240, h: 180, fill: "rgba(22, 29, 48, 0.7)", stroke: "#3a86ff" },
            { id: "R4B", name: "Room 4B (Conference Hall)", x: 320, y: 40, w: 320, h: 180, fill: "rgba(22, 29, 48, 0.7)", stroke: "#3a86ff" },
            { id: "R4C", name: "Room 4C (Server Core)", x: 40, y: 260, w: 240, h: 220, fill: "rgba(22, 29, 48, 0.7)", stroke: "#3a86ff" },
            { id: "R4D", name: "Room 4D (Faculty Offices)", x: 320, y: 260, w: 320, h: 220, fill: "rgba(22, 29, 48, 0.7)", stroke: "#3a86ff" },
            { id: "CORR", name: "Central Corridor", x: 280, y: 40, w: 40, h: 440, fill: "rgba(16, 21, 34, 0.8)", stroke: "#22314e" },
            { id: "STAIR_E", name: "East Stairwell & Emergency Exit", x: 680, y: 160, w: 160, h: 200, fill: "rgba(6, 214, 160, 0.12)", stroke: "#06d6a0", isExit: true }
        ];

        // WiFi Access Points deployed on Floor 4
        this.accessPoints = [
            { id: "AP_4_1", name: "AP-4-West (Lab)", x: 160, y: 130, floor: 4, isOnline: true, radius: 180, baseRssiAt1m: -40, n: 3.2 },
            { id: "AP_4_2", name: "AP-4-North (Conference)", x: 480, y: 130, floor: 4, isOnline: true, radius: 180, baseRssiAt1m: -40, n: 3.2 },
            { id: "AP_4_3", name: "AP-4-Core (Server)", x: 160, y: 370, floor: 4, isOnline: true, radius: 180, baseRssiAt1m: -40, n: 3.2 },
            { id: "AP_4_EAST_12", name: "AP-4-East-12 (Exit)", x: 500, y: 370, floor: 4, isOnline: true, radius: 180, baseRssiAt1m: -40, n: 3.2 }
        ];

        // Survey Calibration Grid for Floor 4 (Fingerprint Database)
        this.surveyGridF4 = [
            { id: "FP_01", x: 120, y: 110, room: "Room 4A (Robotics Lab)", rssi: { "AP_4_1": -48, "AP_4_2": -72, "AP_4_3": -70, "AP_4_EAST_12": -85 } },
            { id: "FP_02", x: 200, y: 150, room: "Room 4A (Robotics Lab)", rssi: { "AP_4_1": -45, "AP_4_2": -68, "AP_4_3": -65, "AP_4_EAST_12": -80 } },
            { id: "FP_03", x: 400, y: 100, room: "Room 4B (Conference Hall)", rssi: { "AP_4_1": -70, "AP_4_2": -46, "AP_4_3": -82, "AP_4_EAST_12": -64 } },
            { id: "FP_04", x: 520, y: 120, room: "Room 4B (Conference Hall)", rssi: { "AP_4_1": -75, "AP_4_2": -42, "AP_4_3": -86, "AP_4_EAST_12": -58 } },
            { id: "FP_05", x: 120, y: 340, room: "Room 4C (Server Core)", rssi: { "AP_4_1": -70, "AP_4_2": -85, "AP_4_3": -44, "AP_4_EAST_12": -78 } },
            { id: "FP_06", x: 450, y: 340, room: "Room 4D (Faculty Offices)", rssi: { "AP_4_1": -80, "AP_4_2": -65, "AP_4_3": -72, "AP_4_EAST_12": -50 } },
            { id: "FP_07", x: 740, y: 240, room: "East Stairwell & Emergency Exit", rssi: { "AP_4_1": -88, "AP_4_2": -62, "AP_4_3": -82, "AP_4_EAST_12": -45 } }
        ];

        // 40 Enrolled Building Occupants Roster
        this.occupants = this.generateRosterData();
    }

    /**
     * Generates realistic roster records for 40 building occupants.
     */
    generateRosterData() {
        const roster = [
            {
                id: "EMP_001",
                name: "Aamir Khan (Lead Researcher)",
                role: "Senior Researcher",
                deviceId: "DEV_AAMIR_PRO",
                mac: "AA:11:BB:22:CC:01",
                badgeInTime: "08:42:15 AM",
                floor: 4,
                x: 480,
                y: 110,
                roomName: "Room 4B (Conference Hall)",
                rawPressurePa: 101181.0,
                status: "NORMAL_INSIDE",
                lastHeartbeatSecAgo: 1.2,
                isHeartbeatActive: true,
                liveRssi: { "AP_4_1": -72, "AP_4_2": -44, "AP_4_3": -84, "AP_4_EAST_12": -60 },
                hasCellularFallback: false
            },
            {
                id: "EMP_002",
                name: "Priya Sharma (Systems Admin)",
                role: "Systems Administrator",
                deviceId: "DEV_PRIYA_02",
                mac: "AA:11:BB:22:CC:02",
                badgeInTime: "09:05:30 AM",
                floor: 4,
                x: 180,
                y: 350,
                roomName: "Room 4C (Server Core)",
                rawPressurePa: 101181.0,
                status: "NORMAL_INSIDE",
                lastHeartbeatSecAgo: 2.0,
                isHeartbeatActive: true,
                liveRssi: { "AP_4_1": -68, "AP_4_2": -85, "AP_4_3": -46, "AP_4_EAST_12": -77 },
                lastSeenAp: "AP_4_3"
            },
            {
                id: "EMP_003",
                name: "David Miller",
                role: "Postdoc Scholar",
                deviceId: "DEV_DAVID_03",
                mac: "AA:11:BB:22:CC:03",
                badgeInTime: "08:55:10 AM",
                floor: 4,
                x: 740,
                y: 250,
                roomName: "East Stairwell",
                rawPressurePa: 101217.0, // Floor 3 transition
                status: "NORMAL_INSIDE",
                lastHeartbeatSecAgo: 3.5,
                isHeartbeatActive: true,
                liveRssi: { "AP_4_1": -86, "AP_4_2": -60, "AP_4_3": -80, "AP_4_EAST_12": -47 }
            },
            {
                id: "EMP_004",
                name: "Dr. Sarah Jenkins",
                role: "Dean of Engineering",
                deviceId: "DEV_SARAH_04",
                mac: "AA:11:BB:22:CC:04",
                badgeInTime: "09:12:00 AM",
                floor: 5,
                x: 400,
                y: 200,
                roomName: "Penthouse Suite",
                rawPressurePa: 101145.0,
                status: "SAFELY_EVACUATED",
                lastHeartbeatSecAgo: 10.0,
                isHeartbeatActive: false,
                liveRssi: {}
            },
            {
                id: "EMP_005",
                name: "Vikram Malhotra",
                role: "Graduate Assistant",
                deviceId: "DEV_VIKRAM_05",
                mac: "AA:11:BB:22:CC:05",
                badgeInTime: "08:30:45 AM",
                floor: 4,
                x: 160,
                y: 110,
                roomName: "Room 4A (Robotics Lab)",
                rawPressurePa: 101181.0,
                status: "NORMAL_INSIDE",
                lastHeartbeatSecAgo: 4.1,
                isHeartbeatActive: true,
                liveRssi: { "AP_4_1": -46, "AP_4_2": -70, "AP_4_3": -68, "AP_4_EAST_12": -82 }
            }
        ];

        // Generate additional 35 occupants who safely evacuated
        const firstNames = ["Arjun", "Kavita", "Rohan", "Ananya", "Marcus", "Elena", "Suresh", "Meera", "Carlos", "Fatima", "Chen", "Yuki", "Alex", "Zoe", "Karan", "Pooja", "Samir", "Ritu", "Daniel", "Siddharth", "Tanya", "Aditya", "Divya", "Rajesh", "Sunita", "Deepak", "Shalini", "Naveen", "Jyoti", "Abhishek", "Geeta", "Manish", "Sunil", "Preeti", "Kunal"];
        
        firstNames.forEach((fname, idx) => {
            const occNum = idx + 6;
            const pad = occNum < 10 ? `0${occNum}` : `${occNum}`;
            roster.push({
                id: `EMP_0${pad}`,
                name: `${fname} ${idx % 2 === 0 ? "Verma" : "Patel"}`,
                role: idx % 3 === 0 ? "Faculty" : (idx % 3 === 1 ? "Researcher" : "Student"),
                deviceId: `DEV_OCC_${pad}`,
                mac: `AA:11:BB:22:CC:${pad}`,
                badgeInTime: `08:${10 + (idx % 40)}:20 AM`,
                floor: 0,
                x: 100 + (idx * 15),
                y: 500,
                roomName: "Ground Exterior Muster Zone",
                rawPressurePa: 101325.0,
                status: "SAFELY_EVACUATED",
                lastHeartbeatSecAgo: 30.0 + idx,
                isHeartbeatActive: false,
                liveRssi: {}
            });
        });

        return roster;
    }

    /**
     * Calculates realistic RSSI in dBm from physical (x, y) coordinates using Log-Distance Path Loss
     */
    calculateRssiFromPosition(x, y) {
        const liveRssi = {};
        this.accessPoints.forEach(ap => {
            if (ap.isOnline) {
                const distPx = Math.hypot(x - ap.x, y - ap.y);
                // 1 meter ≈ 20 pixels on our 30x30m floorplan
                const distMeters = Math.max(0.8, distPx / 20.0);
                // Log-distance path loss: RSSI = A - 10 * n * log10(d)
                const rssi = Math.round(ap.baseRssiAt1m - (10.0 * ap.n * Math.log10(distMeters)));
                // Clamp realistic range
                liveRssi[ap.id] = Math.max(-95, Math.min(-35, rssi));
            } else {
                liveRssi[ap.id] = -95;
            }
        });
        return liveRssi;
    }

    /**
     * Resolves architectural room boundary from (x, y)
     */
    getRoomFromCoordinates(x, y) {
        for (const r of this.roomsF4) {
            if (x >= r.x && x <= (r.x + r.w) && y >= r.y && y <= (r.y + r.h)) {
                return r.name;
            }
        }
        return "Corridor / Open Floor Area";
    }

    /**
     * Vertical Altimetry Solver
     */
    calculateFloorFromPressure(pressurePa) {
        const deltaP = this.referencePressurePa - pressurePa;
        const heightMeters = deltaP / this.paPerMeter;
        const floor = Math.max(0, Math.min(10, Math.round(heightMeters / this.floorHeightMeters)));
        return {
            deltaP: deltaP.toFixed(1),
            heightMeters: heightMeters.toFixed(2),
            floor: floor
        };
    }

    /**
     * WiFi Fingerprinting k-NN Euclidean Matching
     */
    matchFingerprint(liveRssi) {
        const scoredPoints = this.surveyGridF4.map(pt => {
            let sumSq = 0;
            const allAps = new Set([...Object.keys(liveRssi), ...Object.keys(pt.rssi)]);
            
            allAps.forEach(ap => {
                const liveVal = liveRssi[ap] || -95;
                const surveyVal = pt.rssi[ap] || -95;
                sumSq += Math.pow(liveVal - surveyVal, 2);
            });

            return {
                ...pt,
                dist: Math.sqrt(sumSq)
            };
        });

        scoredPoints.sort((a, b) => a.dist - b.dist);
        const topMatches = scoredPoints.slice(0, 3);

        // Inverse distance weighted coordinates
        let totalW = 0, wx = 0, wy = 0;
        topMatches.forEach(m => {
            const w = 1.0 / (m.dist + 0.001);
            totalW += w;
            wx += m.x * w;
            wy += m.y * w;
        });

        return {
            x: Math.round(wx / totalW),
            y: Math.round(wy / totalW),
            room: topMatches[0].room,
            topMatches: topMatches,
            allScored: scoredPoints
        };
    }

    /**
     * Reconciles all occupant statuses
     */
    getTriageSummary() {
        let expected = 0;
        let safe = 0;
        let activeSos = 0;
        let signalLost = 0;
        let unaccounted = 0;

        this.occupants.forEach(o => {
            if (o.status === "SAFELY_EVACUATED") {
                safe++;
            } else {
                expected++;
                if (o.status === "ACTIVE_SOS") activeSos++;
                else if (o.status === "SIGNAL_LOST") signalLost++;
                else if (o.status === "UNACCOUNTED") unaccounted++;
            }
        });

        return {
            totalExpected: 40,
            inside: expected,
            safe: safe,
            activeSos: activeSos,
            signalLost: signalLost,
            unaccounted: unaccounted
        };
    }
}

// Global simulation engine instance
window.engine = new SimulationEngine();
