# Hardware Prototype Bill of Materials (BOM) & Testbed Setup Guide
## Fire Emergency Occupant Localization System

---

### 1. Prototype Bill of Materials (Budget Hardware Testbed)

| Item # | Component Name | Model / Specification | Purpose | Quantity | Approx. Unit Cost (INR / USD) |
|---|---|---|---|---|---|
| 1 | **Microcontroller Board** | ESP32-WROOM-32 NodeMCU | AP Stand-in / WiFi Beacon Broadcaster | 3 | ₹450 / $5.50 |
| 2 | **Digital Barometric Sensor** | Bosch BMP280 (I2C/SPI Module) | Reference Altimeter & Phone Sensor Module | 2 | ₹180 / $2.20 |
| 3 | **Edge Compute Node** | Raspberry Pi 4 Model B (4GB) or Local Laptop | Ingestion Server & Redis Broker | 1 | ₹4,500 / $55.00 (or existing PC) |
| 4 | **Test Devices** | Android Smartphones with Barometer | Occupant Handhelds (e.g. Pixel / Galaxy / Xiaomi) | 2–3 | Existing phones |
| 5 | **Power & Accessories** | Micro-USB Cables, Breadboard, Jumper Wires | Benchtop wiring & 5V USB power banks | 1 Set | ₹300 / $3.50 |
| **Total Estimated Hardware Cost** | | | | | **~₹2,000 / $25 (excluding existing phones/PC)** |

---

### 2. ESP32 + BMP280 Reference Barometer Wiring Schematic

```
 ESP32 NodeMCU Pinout             BMP280 Sensor Module
 +-------------------+             +------------------+
 |               3V3 |------------>| VCC (3.3V)       |
 |               GND |------------>| GND              |
 |         GPIO 22   |------------>| SCL (I2C Clock)  |
 |         GPIO 21   |------------>| SDA (I2C Data)   |
 +-------------------+             +------------------+
```

#### ESP32 Reference Station Arduino/C++ Snippet
```cpp
#include <Wire.h>
#include <Adafruit_BMP280.h>
#include <WiFi.h>
#include <HTTPClient.h>

Adafruit_BMP280 bmp;
const char* ssid = "LAB_WIFI";
const char* password = "PASSWORD123";
const char* serverUrl = "http://192.168.1.100:8000/api/telemetry/reference";

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  if (!bmp.begin(0x76)) {
    Serial.println("BMP280 initialization failed!");
    while (1);
  }
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void loop() {
  float pressure = bmp.readPressure(); // Pascals
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    String payload = "{\"node_id\":\"REF_LOBBY_0\",\"pressure_pa\":" + String(pressure, 2) + "}";
    http.POST(payload);
    http.end();
  }
  delay(1000); // 1Hz reference broadcast
}
```

---

### 3. Step-by-Step Lab Validation Protocol (For Demo & Viva)

#### Test 1: Vertical Stairwell Altimetry Accuracy
1. Place the ESP32 Reference sensor on Ground Floor ($F=0$).
2. Carry the test smartphone to Floor 1, Floor 2, Floor 3, and Floor 4 in a university stairwell.
3. **Verify**: Record pressure at each level.
   - Ground: $101,325\text{ Pa}$ ($\Delta P = 0\text{ Pa} \to F=0$)
   - Floor 1 ($3\text{m}$): $101,289\text{ Pa}$ ($\Delta P = 36\text{ Pa} \to F=1$)
   - Floor 2 ($6\text{m}$): $101,253\text{ Pa}$ ($\Delta P = 72\text{ Pa} \to F=2$)
   - Floor 4 ($12\text{m}$): $101,181\text{ Pa}$ ($\Delta P = 144\text{ Pa} \to F=4$)
4. **Result**: 100% floor disambiguation accuracy without boundary flickering.

#### Test 2: Fall Detection Sensor Fusion
1. Hold the phone upright (standing height $\approx 1.4\text{m}$, pressure $P_1$).
2. Drop arm quickly onto a table/cushion (simulating fall, height $\approx 0.2\text{m}$).
3. **Verify**: Accelerometer detects $> 2.8g$ jolt vector followed immediately by $\approx 14\text{ Pa}$ pressure rise ($1.2\text{m}$ drop). The mobile app triggers automated SOS with a 5-second cancel countdown.

#### Test 3: Sudden Unconsciousness / Signal Loss Transition
1. Trigger SOS on Phone A.
2. Turn Phone A to Airplane Mode or kill app process (simulating phone destruction / fainted victim).
3. **Verify**: Within 10 seconds, the FCC Responder Dashboard transitions Person A from `ACTIVE SOS` (Amber/Red) to `SIGNAL LOST` (Flashing Crimson Red) with frozen coordinates and timestamp.
