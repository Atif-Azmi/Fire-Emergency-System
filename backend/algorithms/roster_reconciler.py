"""
Occupancy Roster & WiFi Event Reconciliation Engine
Detects fainted, silent, and unaccounted building occupants by merging
Badge-in/Badge-out logs, real-time AP client tables, and heartbeats.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

class OccupantProfile:
    def __init__(self, occupant_id: str, name: str, role: str, device_id: str, mac_address: str):
        self.occupant_id = occupant_id
        self.name = name
        self.role = role
        self.device_id = device_id
        self.mac_address = mac_address
        self.is_badged_in: bool = False
        self.badge_in_time: Optional[datetime] = None
        self.badge_out_time: Optional[datetime] = None

class RosterReconciler:
    def __init__(self, heartbeat_timeout_seconds: int = 20):
        self.timeout_sec = heartbeat_timeout_seconds
        self.profiles: Dict[str, OccupantProfile] = {} # occupant_id -> Profile
        self.device_to_occupant: Dict[str, str] = {}   # device_id -> occupant_id
        self.mac_to_occupant: Dict[str, str] = {}      # mac -> occupant_id
        
        # Live state
        self.last_heartbeats: Dict[str, Dict[str, Any]] = {} # device_id -> telemetry
        self.ap_active_clients: Dict[str, Dict[str, Any]] = {} # mac -> {ap_id, last_seen, rssi}
        self.offline_aps: set = set()

    def enroll_occupant(self, profile: OccupantProfile) -> None:
        self.profiles[profile.occupant_id] = profile
        self.device_to_occupant[profile.device_id] = profile.occupant_id
        self.mac_to_occupant[profile.mac_address] = profile.occupant_id

    def record_badge_event(self, occupant_id: str, event_type: str, timestamp: Optional[datetime] = None) -> None:
        if occupant_id in self.profiles:
            ts = timestamp or datetime.utcnow()
            if event_type.upper() == "IN":
                self.profiles[occupant_id].is_badged_in = True
                self.profiles[occupant_id].badge_in_time = ts
                self.profiles[occupant_id].badge_out_time = None
            elif event_type.upper() == "OUT":
                self.profiles[occupant_id].is_badged_in = False
                self.profiles[occupant_id].badge_out_time = ts

    def ingest_heartbeat(self, device_id: str, telemetry: Dict[str, Any]) -> None:
        telemetry["received_at"] = datetime.utcnow()
        self.last_heartbeats[device_id] = telemetry

    def ingest_wifi_controller_client(self, mac_address: str, ap_id: str, rssi: float) -> None:
        self.ap_active_clients[mac_address] = {
            "ap_id": ap_id,
            "rssi": rssi,
            "updated_at": datetime.utcnow()
        }

    def set_ap_status(self, ap_id: str, is_online: bool) -> None:
        if not is_online:
            self.offline_aps.add(ap_id)
        else:
            self.offline_aps.discard(ap_id)

    def reconcile_all_occupants(self) -> Dict[str, Any]:
        """
        Primary reconciliation loop that classifies every enrolled occupant into:
        - ACTIVE_SOS: Conscious distress signal transmitted with active heartbeat
        - SIGNAL_LOST: Previously sent SOS / active, but heartbeat ceased (fainted/destroyed)
        - UNACCOUNTED: Badged-in, never signaled SOS, but dropped off WiFi APs
        - NORMAL_INSIDE: Badged-in, active heartbeat / connected to AP, no SOS
        - SAFELY_EVACUATED: Badged out or detected safely at ground muster zone
        """
        now = datetime.utcnow()
        triage_summary = {
            "total_expected_in_building": 0,
            "active_sos": [],
            "signal_lost": [],
            "unaccounted": [],
            "normal_inside": [],
            "safely_evacuated": [],
            "ap_outages": list(self.offline_aps)
        }

        for occ_id, prof in self.profiles.items():
            if not prof.is_badged_in:
                triage_summary["safely_evacuated"].append({
                    "occupant_id": occ_id,
                    "name": prof.name,
                    "status": "SAFELY_EVACUATED",
                    "reason": "Badged out at exterior terminal"
                })
                continue

            triage_summary["total_expected_in_building"] += 1
            dev_id = prof.device_id
            mac = prof.mac_address
            
            has_recent_heartbeat = False
            last_hb = self.last_heartbeats.get(dev_id)
            if last_hb and (now - last_hb["received_at"]).total_seconds() <= self.timeout_sec:
                has_recent_heartbeat = True

            # Check if phone pressed SOS
            is_sos_flagged = last_hb.get("sos_triggered", False) if last_hb else False

            if is_sos_flagged and has_recent_heartbeat:
                triage_summary["active_sos"].append({
                    "occupant_id": occ_id,
                    "name": prof.name,
                    "device_id": dev_id,
                    "status": "ACTIVE_SOS",
                    "floor": last_hb.get("floor", 0),
                    "room": last_hb.get("room_name", "Unknown"),
                    "last_seen_seconds_ago": round((now - last_hb["received_at"]).total_seconds(), 1)
                })
            elif is_sos_flagged and not has_recent_heartbeat:
                # Fainted victim whose heartbeat ceased!
                triage_summary["signal_lost"].append({
                    "occupant_id": occ_id,
                    "name": prof.name,
                    "device_id": dev_id,
                    "status": "SIGNAL_LOST",
                    "floor": last_hb.get("floor", 0) if last_hb else "Unknown",
                    "last_known_room": last_hb.get("room_name", "Unknown") if last_hb else "Unknown",
                    "last_seen_seconds_ago": round((now - last_hb["received_at"]).total_seconds(), 1) if last_hb else "N/A",
                    "urgency": "CRITICAL - FAINTED / SIGNAL CEASED"
                })
            elif not is_sos_flagged and has_recent_heartbeat:
                triage_summary["normal_inside"].append({
                    "occupant_id": occ_id,
                    "name": prof.name,
                    "device_id": dev_id,
                    "status": "NORMAL_INSIDE",
                    "floor": last_hb.get("floor", 0),
                    "room": last_hb.get("room_name", "Unknown")
                })
            else:
                # No active heartbeat and not badged out! Check WiFi AP client table
                wifi_client = self.ap_active_clients.get(mac)
                last_ap = wifi_client["ap_id"] if wifi_client else "Unknown AP"
                
                # Check if the AP itself is down
                ap_failed = last_ap in self.offline_aps

                triage_summary["unaccounted"].append({
                    "occupant_id": occ_id,
                    "name": prof.name,
                    "device_id": dev_id,
                    "status": "UNACCOUNTED",
                    "last_associated_ap": last_ap,
                    "ap_power_failure": ap_failed,
                    "inference": "Occupant never signaled SOS, device dropped off WiFi. Likely trapped or incapacitated."
                })

        return triage_summary

if __name__ == "__main__":
    reconciler = RosterReconciler(heartbeat_timeout_seconds=15)
    
    # Enroll 3 occupants
    p_a = OccupantProfile("EMP_001", "Aamir Khan", "Senior Researcher", "DEV_AAMIR", "AA:BB:CC:11:22:33")
    p_b = OccupantProfile("EMP_002", "Priya Sharma", "Lab Assistant", "DEV_PRIYA", "AA:BB:CC:44:55:66")
    p_c = OccupantProfile("EMP_003", "David Miller", "Visitor", "DEV_DAVID", "AA:BB:CC:77:88:99")

    for p in [p_a, p_b, p_c]:
        reconciler.enroll_occupant(p)
        reconciler.record_badge_event(p.occupant_id, "IN")

    # Person A: Active SOS on Floor 4
    reconciler.ingest_heartbeat("DEV_AAMIR", {
        "floor": 4,
        "room_name": "Room 4B (Conference)",
        "sos_triggered": True
    })

    # Person B: Never sent SOS, but associated with AP_12
    reconciler.ingest_wifi_controller_client("AA:BB:CC:44:55:66", "AP_4_EAST_12", -70.0)

    # Person C: Badged out earlier
    reconciler.record_badge_event("EMP_003", "OUT")

    summary = reconciler.reconcile_all_occupants()
    print("--- Occupant Reconciliation Matrix ---")
    print(f"Total Expected: {summary['total_expected_in_building']}")
    print(f"Active SOS: {len(summary['active_sos'])}")
    print(f"Signal Lost: {len(summary['signal_lost'])}")
    print(f"Unaccounted: {len(summary['unaccounted'])}")
    print(f"Safely Evacuated: {len(summary['safely_evacuated'])}")
