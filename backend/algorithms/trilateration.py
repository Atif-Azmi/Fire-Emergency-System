"""
Trilateration Indoor Positioning Engine
Implements Log-Distance Path Loss RSSI-to-distance conversion and
least-squares circle intersection solver for 2D coordinate estimation.
"""

import math
from typing import List, Tuple, Dict, Any, Optional

class AccessPointNode:
    def __init__(self, ap_id: str, x: float, y: float, floor: int, rssi_at_1m: float = -40.0, path_loss_exponent: float = 3.2):
        self.ap_id = ap_id
        self.x = x
        self.y = y
        self.floor = floor
        self.a_1m = rssi_at_1m
        self.n = path_loss_exponent

    def rssi_to_distance(self, rssi: float) -> float:
        """Converts RSSI in dBm to approximate distance in meters using Log-Distance Path Loss."""
        # RSSI = A - 10 * n * log10(d)  =>  d = 10 ^ ((A - RSSI) / (10 * n))
        exponent = (self.a_1m - rssi) / (10.0 * self.n)
        return max(0.2, 10.0 ** exponent)

class TrilaterationSolver:
    def __init__(self):
        self.access_points: Dict[str, AccessPointNode] = {}

    def register_ap(self, ap: AccessPointNode) -> None:
        self.access_points[ap.ap_id] = ap

    def solve_position_3ap(self, live_rssi: Dict[str, float], floor: int) -> Dict[str, Any]:
        """
        Solves 2D position given at least 3 visible APs on the same floor.
        Uses algebraic linearization by subtracting circle equations:
        (x - x_i)^2 + (y - y_i)^2 = d_i^2
        """
        valid_aps = []
        for ap_id, rssi in live_rssi.items():
            if ap_id in self.access_points and self.access_points[ap_id].floor == floor:
                dist = self.access_points[ap_id].rssi_to_distance(rssi)
                valid_aps.append((self.access_points[ap_id], dist, rssi))

        if len(valid_aps) < 3:
            return {
                "success": False,
                "error": f"Trilateration requires >= 3 APs on floor {floor}, found {len(valid_aps)}",
                "estimated_x": None,
                "estimated_y": None
            }

        # Select top 3 APs with strongest signals (smallest distances)
        valid_aps.sort(key=lambda item: item[1])
        ap1, d1, r1 = valid_aps[0]
        ap2, d2, r2 = valid_aps[1]
        ap3, d3, r3 = valid_aps[2]

        x1, y1 = ap1.x, ap1.y
        x2, y2 = ap2.x, ap2.y
        x3, y3 = ap3.x, ap3.y

        # Linear 2x2 system:
        # 2(x2 - x1)x + 2(y2 - y1)y = (d1^2 - d2^2) - (x1^2 - x2^2) - (y1^2 - y2^2)
        # 2(x3 - x1)x + 2(y3 - y1)y = (d1^3 - d3^2) - (x1^2 - x3^2) - (y1^2 - y3^2)

        A = 2 * (x2 - x1)
        B = 2 * (y2 - y1)
        C = (d1**2 - d2**2) - (x1**2 - x2**2) - (y1**2 - y2**2)

        D = 2 * (x3 - x1)
        E = 2 * (y3 - y1)
        F = (d1**2 - d3**2) - (x1**2 - x3**2) - (y1**2 - y3**2)

        det = (A * E) - (B * D)
        if abs(det) < 1e-6:
            # Collinear APs degenerate case fallback
            avg_x = (x1 + x2 + x3) / 3.0
            avg_y = (y1 + y2 + y3) / 3.0
            return {
                "success": True,
                "method": "Centroid Fallback (Collinear APs)",
                "estimated_x": round(avg_x, 2),
                "estimated_y": round(avg_y, 2)
            }

        x = ((C * E) - (F * B)) / det
        y = ((A * F) - (D * C)) / det

        return {
            "success": True,
            "method": "Closed-form 3-Circle Linearization",
            "estimated_x": round(x, 2),
            "estimated_y": round(y, 2),
            "ap_distances": [
                {"ap_id": ap1.ap_id, "coord": (x1, y1), "distance_m": round(d1, 2), "rssi": r1},
                {"ap_id": ap2.ap_id, "coord": (x2, y2), "distance_m": round(d2, 2), "rssi": r2},
                {"ap_id": ap3.ap_id, "coord": (x3, y3), "distance_m": round(d3, 2), "rssi": r3},
            ]
        }

if __name__ == "__main__":
    solver = TrilaterationSolver()
    solver.register_ap(AccessPointNode("AP1", x=0.0, y=0.0, floor=4, rssi_at_1m=-40.0, path_loss_exponent=3.0))
    solver.register_ap(AccessPointNode("AP2", x=10.0, y=0.0, floor=4, rssi_at_1m=-40.0, path_loss_exponent=3.0))
    solver.register_ap(AccessPointNode("AP3", x=0.0, y=10.0, floor=4, rssi_at_1m=-40.0, path_loss_exponent=3.0))

    # Test with known distances
    test_rssi = {"AP1": -58.0, "AP2": -65.0, "AP3": -63.0}
    res = solver.solve_position_3ap(test_rssi, floor=4)
    print("--- Trilateration Solution ---")
    for k, v in res.items():
        print(f"{k}: {v}")
