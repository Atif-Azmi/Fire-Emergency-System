"""
Lightweight REST API & Telemetry Ingestion Server for Python standard library.
Runs zero-dependency HTTP server for the Fire Emergency Localization Ecosystem.
"""

import os
import sys
import json
import socket
from typing import Any, Dict, List, Optional
from http.server import HTTPServer, BaseHTTPRequestHandler

# Ensure backend directory is in sys.path for direct execution
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from algorithms.barometer import BarometricAltimeter
from algorithms.fingerprinting import WiFiFingerprintEngine, RoomBoundary
from algorithms.trilateration import TrilaterationSolver, AccessPointNode
from algorithms.roster_reconciler import RosterReconciler, OccupantProfile

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

altimeter = BarometricAltimeter(floor_height_meters=3.0, pa_per_meter=12.0)
fingerprint_engine = WiFiFingerprintEngine(k_neighbors=3)
trilateration_solver = TrilaterationSolver()
reconciler = RosterReconciler(heartbeat_timeout_seconds=15)
is_emergency_active = False

# Initialize standard blueprint and APs
def init_system_state():
    # Setup Floor 4 Rooms
    fingerprint_engine.add_room_boundary(RoomBoundary("R4A", "Room 4A (Robotics Lab)", 4, 40, 280, 40, 220))
    fingerprint_engine.add_room_boundary(RoomBoundary("R4B", "Room 4B (Conference Hall)", 4, 320, 640, 40, 220))
    fingerprint_engine.add_room_boundary(RoomBoundary("R4C", "Room 4C (Server Core)", 4, 40, 280, 260, 480))
    fingerprint_engine.add_room_boundary(RoomBoundary("R4D", "Room 4D (Faculty Offices)", 4, 320, 640, 260, 480))
    fingerprint_engine.add_room_boundary(RoomBoundary("STAIR_E", "East Stairwell & Emergency Exit", 4, 680, 840, 160, 360, is_stairwell=True))

    # Setup Survey Grid for Floor 4
    grid_f4 = [
        {"x": 120, "y": 110, "rssi": {"AP_4_1": -48, "AP_4_2": -72, "AP_4_3": -70, "AP_4_EAST_12": -85}},
        {"x": 200, "y": 150, "rssi": {"AP_4_1": -45, "AP_4_2": -68, "AP_4_3": -65, "AP_4_EAST_12": -80}},
        {"x": 400, "y": 100, "rssi": {"AP_4_1": -70, "AP_4_2": -46, "AP_4_3": -82, "AP_4_EAST_12": -64}},
        {"x": 520, "y": 120, "rssi": {"AP_4_1": -75, "AP_4_2": -42, "AP_4_3": -86, "AP_4_EAST_12": -58}},
        {"x": 120, "y": 340, "rssi": {"AP_4_1": -70, "AP_4_2": -85, "AP_4_3": -44, "AP_4_EAST_12": -78}},
        {"x": 450, "y": 340, "rssi": {"AP_4_1": -80, "AP_4_2": -65, "AP_4_3": -72, "AP_4_EAST_12": -50}},
        {"x": 740, "y": 240, "rssi": {"AP_4_1": -88, "AP_4_2": -62, "AP_4_3": -82, "AP_4_EAST_12": -45}},
    ]
    fingerprint_engine.load_survey_grid(4, grid_f4)

    # Setup AP Nodes for Trilateration
    trilateration_solver.register_ap(AccessPointNode("AP_4_1", 160.0, 130.0, 4, -40.0, 3.2))
    trilateration_solver.register_ap(AccessPointNode("AP_4_2", 480.0, 130.0, 4, -40.0, 3.2))
    trilateration_solver.register_ap(AccessPointNode("AP_4_3", 160.0, 370.0, 4, -40.0, 3.2))
    trilateration_solver.register_ap(AccessPointNode("AP_4_EAST_12", 500.0, 370.0, 4, -40.0, 3.2))

    # Enroll Real Occupants Roster with requested team names
    occupants = [
        OccupantProfile("EMP_001", "Atif Azmi", "Project Lead / Researcher", "DEV_ATIF_PRO", "AA:11:BB:22:CC:01"),
        OccupantProfile("EMP_002", "Nashit Khan", "Safety & Systems Lead", "DEV_NASHIT_02", "AA:11:BB:22:CC:02"),
        OccupantProfile("EMP_003", "Aamir Khan", "Senior Hardware Engineer", "DEV_AAMIR_03", "AA:11:BB:22:CC:03"),
        OccupantProfile("EMP_004", "Shawaiz Ahmed", "Network Architect", "DEV_SHAWAIZ_04", "AA:11:BB:22:CC:04"),
        OccupantProfile("EMP_005", "Ali Salman", "IoT Embedded Systems", "DEV_ALI_05", "AA:11:BB:22:CC:05"),
        OccupantProfile("EMP_006", "Zayn Malik", "Research Scholar", "DEV_ZAYN_06", "AA:11:BB:22:CC:06"),
        OccupantProfile("EMP_007", "Mrunali Joshi", "Data & ML Engineer", "DEV_MRUNALI_07", "AA:11:BB:22:CC:07"),
    ]
    for o in occupants:
        reconciler.enroll_occupant(o)
        reconciler.record_badge_event(o.occupant_id, "IN")

    # Initial live associations
    reconciler.ingest_heartbeat("DEV_ATIF_PRO", {
        "floor": 4,
        "room_name": "Room 4B (Conference Hall)",
        "pos_x": 480,
        "pos_y": 110,
        "pressure_pa": 101181.0,
        "sos_triggered": false
    })

    reconciler.ingest_wifi_controller_client("AA:11:BB:22:CC:02", "AP_4_3", -46.0)

init_system_state()

class EmergencyAPIHandler(BaseHTTPRequestHandler):
    def _send_json(self, data: Any, status: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, filepath: str, content_type: str):
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self._send_json({"error": f"File not found: {str(e)}"}, status=404)

    def do_OPTIONS(self):
        self._send_json({"status": "ok"})

    def do_GET(self):
        global is_emergency_active
        root_workspace = os.path.abspath(os.path.join(current_dir, ".."))
        
        # 1. Root & Static Web UI Serving
        if self.path in ("/", "/index.html"):
            index_path = os.path.join(root_workspace, "index.html")
            self._serve_file(index_path, "text/html; charset=utf-8")
        elif self.path.startswith("/css/"):
            css_path = os.path.join(root_workspace, self.path.lstrip("/"))
            self._serve_file(css_path, "text/css; charset=utf-8")
        elif self.path.startswith("/js/"):
            js_path = os.path.join(root_workspace, self.path.lstrip("/"))
            self._serve_file(js_path, "application/javascript; charset=utf-8")
        
        # 2. Live API Endpoints
        elif self.path == "/api/status":
            summary = reconciler.reconcile_all_occupants()
            summary["is_emergency_active"] = is_emergency_active
            summary["reference_pressure_pa"] = altimeter.reference_pressure_pa
            summary["server_ip"] = get_local_ip()
            self._send_json(summary)
        elif self.path == "/api/network-info":
            self._send_json({
                "local_ip": get_local_ip(),
                "port": 8080,
                "mobile_connect_url": f"http://{get_local_ip()}:8080",
                "status": "ONLINE"
            })
        elif self.path == "/api/health":
            self._send_json({"status": "ONLINE", "service": "Fire Emergency Localization Engine v2.4", "ip": get_local_ip()})
        else:
            self._send_json({"error": "Endpoint not found", "available_endpoints": ["/", "/api/status", "/api/network-info", "/api/telemetry/heartbeat"]}, status=404)

    def do_POST(self):
        global is_emergency_active
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len).decode("utf-8")
        data = json.loads(post_body) if post_body else {}

        if self.path == "/api/telemetry/heartbeat":
            # Ingest live phone / device telemetry
            dev_id = data.get("device_id", "UNKNOWN_DEV")
            raw_pa = float(data.get("pressure_pa", 101325.0))
            live_rssi = data.get("rssi", {})
            sos = bool(data.get("sos_triggered", False))
            user_name = data.get("user_name", None)

            # Auto-enroll if new device connects
            if dev_id not in reconciler.device_to_occupant:
                new_occ = OccupantProfile(
                    occupant_id=f"REAL_{dev_id[-4:]}",
                    name=user_name or f"Live Device ({dev_id})",
                    role="Active Mobile Client",
                    device_id=dev_id,
                    mac_address=data.get("mac_address", "AA:FF:CC:00:11")
                )
                reconciler.enroll_occupant(new_occ)
                reconciler.record_badge_event(new_occ.occupant_id, "IN")

            # 1. Resolve Floor via Altimetry
            floor_res = altimeter.calculate_floor(dev_id, raw_pa)
            floor_num = floor_res["resolved_floor"]

            # 2. Resolve Room via Fingerprinting
            fp_res = fingerprint_engine.locate_position(floor_num, live_rssi)

            telemetry = {
                "device_id": dev_id,
                "floor": floor_num,
                "height_m": floor_res["calculated_height_meters"],
                "room_id": fp_res.get("room_id", "CORR"),
                "room_name": fp_res.get("room_name", "Open Area"),
                "pos_x": fp_res.get("estimated_x") or data.get("pos_x", 400),
                "pos_y": fp_res.get("estimated_y") or data.get("pos_y", 200),
                "pressure_pa": raw_pa,
                "sos_triggered": sos
            }
            reconciler.ingest_heartbeat(dev_id, telemetry)
            self._send_json({"status": "ACCEPTED", "telemetry": telemetry, "resolved_floor": floor_num})

        elif self.path == "/api/emergency/trigger":
            is_emergency_active = data.get("emergency_state", True)
            self._send_json({"status": "EMERGENCY_STATE_UPDATED", "is_emergency_active": is_emergency_active})

        elif self.path == "/api/telemetry/reference":
            ref_pa = float(data.get("pressure_pa", 101325.0))
            altimeter.update_reference_pressure(ref_pa)
            self._send_json({"status": "REFERENCE_UPDATED", "reference_pa": ref_pa})

        elif self.path == "/api/ap/status":
            ap_id = data.get("ap_id")
            online = data.get("is_online", True)
            if ap_id:
                reconciler.set_ap_status(ap_id, online)
            self._send_json({"status": "AP_STATUS_UPDATED", "ap_id": ap_id, "is_online": online})

        else:
            self._send_json({"error": "Invalid POST endpoint"}, status=404)

def run_server(port=8080):
    server = HTTPServer(("0.0.0.0", port), EmergencyAPIHandler)
    local_ip = get_local_ip()
    print("=" * 60)
    print("🔥 FIRE EMERGENCY OCCUPANT LOCALIZATION ENGINE v2.4")
    print(f"📡 Local Dashboard: http://localhost:{port}")
    print(f"📱 Mobile Phone URL: http://{local_ip}:{port}")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")

if __name__ == "__main__":
    run_server()

altimeter = BarometricAltimeter(floor_height_meters=3.0, pa_per_meter=12.0)
fingerprint_engine = WiFiFingerprintEngine(k_neighbors=3)
trilateration_solver = TrilaterationSolver()
reconciler = RosterReconciler(heartbeat_timeout_seconds=20)

# Initialize standard blueprint and APs
def init_system_state():
    # Setup Floor 4 Rooms
    fingerprint_engine.add_room_boundary(RoomBoundary("R4A", "Room 4A (Robotics Lab)", 4, 2, 14, 2, 14))
    fingerprint_engine.add_room_boundary(RoomBoundary("R4B", "Room 4B (Conference Room)", 4, 16, 30, 2, 14))
    fingerprint_engine.add_room_boundary(RoomBoundary("R4C", "Room 4C (Server Room)", 4, 2, 14, 16, 28))
    fingerprint_engine.add_room_boundary(RoomBoundary("R4D", "Room 4D (Executive Office)", 4, 16, 30, 16, 28))
    fingerprint_engine.add_room_boundary(RoomBoundary("STAIR_E", "East Stairwell Exit", 4, 30, 36, 12, 18, is_stairwell=True))

    # Setup Survey Grid for Floor 4
    grid_f4 = [
        {"x": 6.0, "y": 6.0, "rssi": {"AP_4_1": -48, "AP_4_2": -72, "AP_4_3": -80}},
        {"x": 22.0, "y": 6.0, "rssi": {"AP_4_1": -70, "AP_4_2": -49, "AP_4_3": -76}},
        {"x": 6.0, "y": 20.0, "rssi": {"AP_4_1": -72, "AP_4_2": -78, "AP_4_3": -47}},
        {"x": 22.0, "y": 20.0, "rssi": {"AP_4_1": -81, "AP_4_2": -65, "AP_4_3": -55}},
        {"x": 32.0, "y": 14.0, "rssi": {"AP_4_1": -85, "AP_4_2": -60, "AP_4_3": -75}},
    ]
    fingerprint_engine.load_survey_grid(4, grid_f4)

    # Setup AP Nodes for Trilateration
    trilateration_solver.register_ap(AccessPointNode("AP_4_1", 8.0, 8.0, 4, -40.0, 3.0))
    trilateration_solver.register_ap(AccessPointNode("AP_4_2", 24.0, 8.0, 4, -40.0, 3.0))
    trilateration_solver.register_ap(AccessPointNode("AP_4_3", 8.0, 22.0, 4, -40.0, 3.0))

    # Enroll Sample Occupants
    occupants = [
        OccupantProfile("EMP_001", "Aamir Khan", "Lead Researcher", "DEV_AAMIR", "AA:BB:CC:11:01"),
        OccupantProfile("EMP_002", "Priya Sharma", "Systems Engineer", "DEV_PRIYA", "AA:BB:CC:11:02"),
        OccupantProfile("EMP_003", "Rahul Verma", "Student", "DEV_RAHUL", "AA:BB:CC:11:03"),
        OccupantProfile("EMP_004", "Dr. S. Mehta", "Professor", "DEV_MEHTA", "AA:BB:CC:11:04"),
        OccupantProfile("EMP_005", "Neha Patel", "Safety Officer", "DEV_NEHA", "AA:BB:CC:11:05"),
    ]
    for o in occupants:
        reconciler.enroll_occupant(o)
        reconciler.record_badge_event(o.occupant_id, "IN")

init_system_state()

class EmergencyAPIHandler(BaseHTTPRequestHandler):
    def _send_json(self, data: Any, status: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, filepath: str, content_type: str):
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self._send_json({"error": f"File not found: {str(e)}"}, status=404)

    def do_OPTIONS(self):
        self._send_json({"status": "ok"})

    def do_GET(self):
        root_workspace = os.path.abspath(os.path.join(current_dir, ".."))
        
        # 1. Root & Static Web UI Serving
        if self.path in ("/", "/index.html"):
            index_path = os.path.join(root_workspace, "index.html")
            self._serve_file(index_path, "text/html; charset=utf-8")
        elif self.path.startswith("/css/"):
            css_path = os.path.join(root_workspace, self.path.lstrip("/"))
            self._serve_file(css_path, "text/css; charset=utf-8")
        elif self.path.startswith("/js/"):
            js_path = os.path.join(root_workspace, self.path.lstrip("/"))
            self._serve_file(js_path, "application/javascript; charset=utf-8")
        
        # 2. API Endpoints
        elif self.path == "/api/status":
            summary = reconciler.reconcile_all_occupants()
            self._send_json(summary)
        elif self.path == "/api/health":
            self._send_json({"status": "ONLINE", "service": "Fire Emergency Localization Engine v2.4"})
        else:
            self._send_json({"error": "Endpoint not found", "available_endpoints": ["/", "/api/status", "/api/health", "/api/telemetry/heartbeat"]}, status=404)

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len).decode("utf-8")
        data = json.loads(post_body) if post_body else {}

        if self.path == "/api/telemetry/heartbeat":
            # Ingest phone telemetry
            dev_id = data.get("device_id", "UNKNOWN_DEV")
            raw_pa = data.get("pressure_pa", 101325.0)
            live_rssi = data.get("rssi", {})
            sos = data.get("sos_triggered", False)

            # 1. Resolve Floor
            floor_res = altimeter.calculate_floor(dev_id, raw_pa)
            floor_num = floor_res["resolved_floor"]

            # 2. Resolve Room via Fingerprinting
            fp_res = fingerprint_engine.locate_position(floor_num, live_rssi)

            telemetry = {
                "device_id": dev_id,
                "floor": floor_num,
                "height_m": floor_res["calculated_height_meters"],
                "room_id": fp_res.get("room_id"),
                "room_name": fp_res.get("room_name"),
                "pos_x": fp_res.get("estimated_x"),
                "pos_y": fp_res.get("estimated_y"),
                "sos_triggered": sos
            }
            reconciler.ingest_heartbeat(dev_id, telemetry)
            self._send_json({"status": "ACCEPTED", "telemetry": telemetry})

        elif self.path == "/api/telemetry/reference":
            ref_pa = data.get("pressure_pa", 101325.0)
            altimeter.update_reference_pressure(ref_pa)
            self._send_json({"status": "REFERENCE_UPDATED", "reference_pa": ref_pa})
        else:
            self._send_json({"error": "Invalid POST endpoint"}, status=404)

def run_server(port=8080):
    server = HTTPServer(("0.0.0.0", port), EmergencyAPIHandler)
    print(f"🔥 Fire Emergency System running at http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping server.")

if __name__ == "__main__":
    run_server()
