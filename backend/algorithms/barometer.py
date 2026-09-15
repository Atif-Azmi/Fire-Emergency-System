"""
Barometric Altimetry & Vertical Localization Engine
Calculates relative height and floor level using differential pressure sensing
with live reference drift cancellation and Exponential Moving Average (EMA) jitter suppression.
"""

from typing import Dict, Any, Optional

class BarometricAltimeter:
    def __init__(
        self,
        floor_height_meters: float = 3.0,
        pa_per_meter: float = 12.0,
        ema_alpha: float = 0.35,
        stairwell_hysteresis_meters: float = 0.4
    ):
        self.floor_height = floor_height_meters
        self.pa_per_meter = pa_per_meter
        self.alpha = ema_alpha
        self.hysteresis = stairwell_hysteresis_meters
        self.reference_pressure_pa: float = 101325.0
        self.device_smoothed_pressure: Dict[str, float] = {}

    def update_reference_pressure(self, lobby_pressure_pa: float) -> None:
        """Updates the live ground-floor lobby reference barometer reading."""
        self.reference_pressure_pa = lobby_pressure_pa

    def smooth_reading(self, device_id: str, raw_pressure_pa: float) -> float:
        """Applies Exponential Moving Average (EMA) filter to suppress sensor noise."""
        if device_id not in self.device_smoothed_pressure:
            self.device_smoothed_pressure[device_id] = raw_pressure_pa
        else:
            prev = self.device_smoothed_pressure[device_id]
            self.device_smoothed_pressure[device_id] = (self.alpha * raw_pressure_pa) + ((1.0 - self.alpha) * prev)
        return self.device_smoothed_pressure[device_id]

    def calculate_floor(self, device_id: str, raw_pressure_pa: float) -> Dict[str, Any]:
        """
        Computes the differential pressure, relative height, and disambiguated floor number.
        Returns detailed telemetry dict with intermediate math steps for transparent logging.
        """
        smoothed_pa = self.smooth_reading(device_id, raw_pressure_pa)
        delta_p = self.reference_pressure_pa - smoothed_pa
        
        # Height in meters above lobby reference
        raw_height = delta_p / self.pa_per_meter
        
        # Floor assignment with mid-point boundary rounding
        calculated_floor = int(round(raw_height / self.floor_height))
        clamped_floor = max(0, min(calculated_floor, 10)) # Support up to 10 floors
        
        # Stairwell / mid-transition detection
        deviation_from_floor_center = abs(raw_height - (clamped_floor * self.floor_height))
        is_in_stairwell = deviation_from_floor_center > (self.floor_height / 2.0 - self.hysteresis)

        return {
            "device_id": device_id,
            "raw_pressure_pa": raw_pressure_pa,
            "smoothed_pressure_pa": round(smoothed_pa, 2),
            "reference_pressure_pa": round(self.reference_pressure_pa, 2),
            "delta_p_pa": round(delta_p, 2),
            "calculated_height_meters": round(raw_height, 2),
            "resolved_floor": clamped_floor,
            "is_in_stairwell_transition": is_in_stairwell,
            "status": "VALID"
        }

if __name__ == "__main__":
    altimeter = BarometricAltimeter(floor_height_meters=3.0, pa_per_meter=12.0)
    
    # Test ground reference: 101,325 Pa
    altimeter.update_reference_pressure(101325.0)
    
    # Test Phone on Floor 4: 101,181 Pa (Delta = 144 Pa -> 12 meters -> Floor 4)
    result = altimeter.calculate_floor("PHONE_AAMIR_01", 101181.0)
    print("--- Altimetry Test Result ---")
    for k, v in result.items():
        print(f"{k}: {v}")
