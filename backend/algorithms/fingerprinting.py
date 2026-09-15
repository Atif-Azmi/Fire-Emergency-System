"""
WiFi RSSI Fingerprinting & Room-Level Indoor Localization Engine
Implements k-Nearest Neighbors (k-NN) in Euclidean signal space,
and resolves exact architectural room assignment using boundary box polygons.
"""

import math
from typing import Dict, List, Tuple, Any, Optional

class RoomBoundary:
    def __init__(self, room_id: str, name: str, floor: int, x_min: float, x_max: float, y_min: float, y_max: float, is_stairwell: bool = False):
        self.room_id = room_id
        self.name = name
        self.floor = floor
        self.x_min = x_min
        self.x_max = x_max
        self.y_min = y_min
        self.y_max = y_max
        self.is_stairwell = is_stairwell

    def contains(self, x: float, y: float) -> bool:
        return (self.x_min <= x <= self.x_max) and (self.y_min <= y <= self.y_max)

class WiFiFingerprintEngine:
    def __init__(self, k_neighbors: int = 3):
        self.k = k_neighbors
        # Floor -> List of {"x": float, "y": float, "rssi": {"AP1": -60, "AP2": -75, ...}}
        self.survey_database: Dict[int, List[Dict[str, Any]]] = {}
        # Floor -> List of RoomBoundary
        self.room_boundaries: Dict[int, List[RoomBoundary]] = {}

    def add_room_boundary(self, room: RoomBoundary) -> None:
        if room.floor not in self.room_boundaries:
            self.room_boundaries[room.floor] = []
        self.room_boundaries[room.floor].append(room)

    def load_survey_grid(self, floor: int, survey_points: List[Dict[str, Any]]) -> None:
        """Loads offline pre-surveyed fingerprint points for a specific floor."""
        self.survey_database[floor] = survey_points

    def calculate_euclidean_distance(self, live_rssi: Dict[str, float], survey_rssi: Dict[str, float]) -> float:
        """
        Computes Euclidean distance in multi-dimensional signal space:
        sqrt(sum((RSSI_live - RSSI_survey)^2))
        Handles missing APs with a penalization floor (-95 dBm).
        """
        all_aps = set(live_rssi.keys()).union(set(survey_rssi.keys()))
        sum_sq = 0.0
        for ap in all_aps:
            val_live = live_rssi.get(ap, -95.0)
            val_survey = survey_rssi.get(ap, -95.0)
            sum_sq += (val_live - val_survey) ** 2
        return math.sqrt(sum_sq)

    def locate_position(self, floor: int, live_rssi: Dict[str, float]) -> Dict[str, Any]:
        """
        Runs k-NN matching against the surveyed grid of the specified floor only,
        estimates (x, y) coordinates via inverse-distance weighted averaging,
        and matches the point to a defined room.
        """
        if floor not in self.survey_database or not self.survey_database[floor]:
            return {
                "floor": floor,
                "x": None,
                "y": None,
                "room_name": "Unknown (Floor Unsurveyed)",
                "confidence": 0.0,
                "error": f"No survey fingerprints available for floor {floor}"
            }

        scored_points = []
        for pt in self.survey_database[floor]:
            dist = self.calculate_euclidean_distance(live_rssi, pt["rssi"])
            scored_points.append((dist, pt["x"], pt["y"], pt))

        # Sort by smallest Euclidean distance in signal space
        scored_points.sort(key=lambda item: item[0])
        top_k = scored_points[:self.k]

        # Inverse-distance weighted interpolation
        total_weight = 0.0
        weighted_x = 0.0
        weighted_y = 0.0

        for dist, x, y, _ in top_k:
            # Avoid division by zero
            weight = 1.0 / (dist + 0.0001)
            total_weight += weight
            weighted_x += x * weight
            weighted_y += y * weight

        estimated_x = round(weighted_x / total_weight, 2)
        estimated_y = round(weighted_y / total_weight, 2)

        # Match to architectural room boundary
        matched_room = None
        if floor in self.room_boundaries:
            for room in self.room_boundaries[floor]:
                if room.contains(estimated_x, estimated_y):
                    matched_room = room
                    break

        room_name = matched_room.name if matched_room else "Corridor / Open Space"
        room_id = matched_room.room_id if matched_room else "CORRIDOR"

        # Signal confidence metric
        best_signal_dist = top_k[0][0]
        confidence = max(0.1, min(0.99, round(1.0 - (best_signal_dist / 60.0), 2)))

        return {
            "floor": floor,
            "estimated_x": estimated_x,
            "estimated_y": estimated_y,
            "room_id": room_id,
            "room_name": room_name,
            "signal_confidence": confidence,
            "top_matches": [
                {"grid_x": p[1], "grid_y": p[2], "signal_dist": round(p[0], 2)}
                for p in top_k
            ]
        }

if __name__ == "__main__":
    engine = WiFiFingerprintEngine(k_neighbors=3)
    
    # Configure Floor 4 rooms
    engine.add_room_boundary(RoomBoundary("R4A", "Room 4A (Lab 1)", floor=4, x_min=0, x_max=10, y_min=0, y_max=12))
    engine.add_room_boundary(RoomBoundary("R4B", "Room 4B (Conference)", floor=4, x_min=10, x_max=20, y_min=12, y_max=24))
    engine.add_room_boundary(RoomBoundary("R4C", "Room 4C (Faculty)", floor=4, x_min=20, x_max=30, y_min=0, y_max=12))
    engine.add_room_boundary(RoomBoundary("STAIR_E", "East Stairwell", floor=4, x_min=28, x_max=32, y_min=20, y_max=26, is_stairwell=True))

    # Load synthetic survey grid for Floor 4
    grid = [
        {"x": 2.0, "y": 2.0, "rssi": {"AP_4_1": -50, "AP_4_2": -75, "AP_4_3": -80}},
        {"x": 2.0, "y": 6.0, "rssi": {"AP_4_1": -55, "AP_4_2": -70, "AP_4_3": -78}},
        {"x": 14.0, "y": 18.0, "rssi": {"AP_4_1": -56, "AP_4_2": -71, "AP_4_3": -77}},
        {"x": 25.0, "y": 5.0, "rssi": {"AP_4_1": -78, "AP_4_2": -82, "AP_4_3": -52}},
    ]
    engine.load_survey_grid(4, grid)

    # Test live reading: Person in Room 4B
    test_live_rssi = {"AP_4_1": -56, "AP_4_2": -71, "AP_4_3": -77}
    res = engine.locate_position(4, test_live_rssi)
    print("--- WiFi Fingerprint Localization Result ---")
    for k, v in res.items():
        print(f"{k}: {v}")
