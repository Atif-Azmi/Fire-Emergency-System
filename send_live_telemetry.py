"""
Live Device Telemetry Streamer & Real-Time Test Client
Sends real HTTP POST telemetry heartbeats to the live Fire Emergency Localization Server.
Simulates a real occupant moving through rooms, climbing stairs, and triggering SOS.
"""

import time
import requests
import sys

SERVER_URL = "http://localhost:8080/api/telemetry/heartbeat"

def send_heartbeat(device_id, user_name, pressure_pa, rssi_dict, is_sos=False):
    payload = {
        "device_id": device_id,
        "user_name": user_name,
        "pressure_pa": pressure_pa,
        "rssi": rssi_dict,
        "sos_triggered": is_sos
    }
    try:
        res = requests.post(SERVER_URL, json=payload, timeout=2.0)
        print(f"[{time.strftime('%X')}] Sent Heartbeat for {user_name} ({device_id}) -> Status: {res.status_code}, Floor: {res.json().get('resolved_floor')}, Room: {res.json().get('telemetry', {}).get('room_name')}")
    except Exception as e:
        print(f"Connection error to {SERVER_URL}: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("📡 STREAMING LIVE TELEMETRY TO FIRE EMERGENCY BACKEND")
    print(f"Target Server: {SERVER_URL}")
    print("=" * 60)

    # Step 1: Occupant in Room 4A (Normal Standby)
    print("\n[Step 1] Occupant in Room 4A (Robotics Lab, Floor 4)")
    for _ in range(3):
        send_heartbeat(
            device_id="DEV_LIVE_PHONE",
            user_name="Live Smartphone (Aamir)",
            pressure_pa=101181.0, # Floor 4
            rssi_dict={"AP_4_1": -46, "AP_4_2": -72, "AP_4_3": -68, "AP_4_EAST_12": -82},
            is_sos=False
        )
        time.sleep(2)

    # Step 2: Occupant Moves to Room 4B and presses SOS!
    print("\n[Step 2] Occupant walks to Room 4B and TRIGGERS SOS!")
    for _ in range(3):
        send_heartbeat(
            device_id="DEV_LIVE_PHONE",
            user_name="Live Smartphone (Aamir)",
            pressure_pa=101181.0, # Floor 4
            rssi_dict={"AP_4_1": -74, "AP_4_2": -42, "AP_4_3": -85, "AP_4_EAST_12": -58},
            is_sos=True
        )
        time.sleep(2)

    # Step 3: Occupant Moves up to 10th Floor!
    print("\n[Step 3] Occupant takes stairs to 10th FLOOR (Pressure drops to 100,965 Pa)")
    for _ in range(3):
        send_heartbeat(
            device_id="DEV_LIVE_PHONE",
            user_name="Live Smartphone (Aamir)",
            pressure_pa=100965.0, # Floor 10
            rssi_dict={"AP_4_1": -88, "AP_4_2": -85, "AP_4_3": -90, "AP_4_EAST_12": -80},
            is_sos=True
        )
        time.sleep(2)

    print("\n✅ Live Test Completed! Check your Fire Command Center screen.")
