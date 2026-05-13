# FlowGarden Hardware Integration

This package defines the data types and adapters for connecting physical hardware
(Raspberry Pi, soil sensors, cameras) to the FlowGarden app.

## Architecture

```
Raspberry Pi
   │
   │  POST /api/flowgarden/ingest/mock-sensor
   │  (JSON payload every N seconds)
   ▼
FlowGarden API (Next.js)
   │
   │  Stores readings in DB or in-memory store
   ▼
FlowGarden Dashboard
```

## Raspberry Pi Setup

### 1. Install dependencies

```bash
pip install requests gpiozero
```

### 2. Python script example

```python
import requests
import time
import json
from datetime import datetime, timezone

FLOWGARDEN_URL = "https://your-domain.com/api/flowgarden/ingest/mock-sensor"
DEVICE_ID = "garden-pi-001"
ZONE_ID = "zone-001"

def read_soil_moisture():
    # Replace with your sensor library (e.g., Adafruit ADS1x15 + capacitive sensor)
    return 42.0

def read_temperature():
    # Replace with DHT22 or DS18B20 reading
    return 26.5

def read_humidity():
    return 60.0

def send_readings():
    payload = {
        "device_id": DEVICE_ID,
        "garden_zone_id": ZONE_ID,
        "readings": [
            {"type": "soil_moisture", "value": read_soil_moisture(), "unit": "%"},
            {"type": "temperature", "value": read_temperature(), "unit": "°C"},
            {"type": "humidity", "value": read_humidity(), "unit": "%"},
        ],
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "source": "raspberry_pi",
        "meta": {
            "firmware_version": "1.0.0"
        }
    }

    try:
        r = requests.post(FLOWGARDEN_URL, json=payload, timeout=10)
        r.raise_for_status()
        print(f"[OK] Ingested {len(payload['readings'])} readings")
    except Exception as e:
        print(f"[ERROR] {e}")

while True:
    send_readings()
    time.sleep(300)  # Send every 5 minutes
```

### 3. Test with curl

```bash
curl -X POST http://localhost:3002/api/flowgarden/ingest/mock-sensor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "garden-pi-001",
    "garden_zone_id": "zone-001",
    "readings": [
      {"type": "soil_moisture", "value": 42, "unit": "%"},
      {"type": "temperature", "value": 26, "unit": "°C"}
    ],
    "recorded_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "source": "raspberry_pi"
  }'
```

## Supported Sensor Types

| `reading_type`   | Unit         | Notes                             |
|-----------------|--------------|-----------------------------------|
| `soil_moisture`  | `%`          | 0–100 volumetric                  |
| `temperature`    | `°C` or `°F` | Air or soil temperature           |
| `humidity`       | `%`          | Relative humidity (0–100)         |
| `light`          | `lux`        | Light intensity                   |
| `ph`             | `pH`         | Soil pH (0–14)                    |
| `ec`             | `mS/cm`      | Electrical conductivity           |
| `water_level`    | `%`          | Tank level (0–100)                |
| `water_flow`     | `L/min`      | Flow meter reading                |

## Supported Device Types

| `type`                | Description                    |
|----------------------|--------------------------------|
| `raspberry_pi`        | Edge compute node              |
| `soil_sensor`         | Capacitive or resistive sensor |
| `camera`              | Pi Camera or USB webcam        |
| `weather_station`     | BME280 / DHT22 / BME680        |
| `water_flow_meter`    | YF-S201 or similar             |
| `water_level_sensor`  | Ultrasonic or float switch     |
| `valve_controller`    | Solenoid valve relay           |

## Mock Testing

Use the TypeScript mock adapter to test without hardware:

```typescript
import { sendMockReading } from '@flowbond/flowgarden-hardware'

// Posts randomized sensor data to your local dev server
await sendMockReading('http://localhost:3002', 'garden-pi-001', 'zone-001')
```

## Future: Automation Triggers

Once valve controllers are connected, automation rules can:

1. Read soil moisture below threshold (e.g., 30%)
2. Trigger `open_valve` action via `POST /api/flowgarden/automation-rules`
3. Valve opens for N minutes
4. Pi confirms valve state via heartbeat

The schema and API routes are already in place — just needs hardware + the trigger evaluation loop.

## FlowBond Identity

In the future, each hardware device will be registered to a FlowBond identity,
allowing:
- Per-user/household data isolation
- Cross-device data sharing with consent
- Privacy-first sensor data ownership
