# WebSocket Integration with Node-RED

This document explains how the AirSense platform integrates with Node-RED to receive real-time sensor data from the Airsense devices.

## Overview

The platform connects to a Node-RED WebSocket server to receive live sensor readings from micro:bit-based Airsense devices equipped with:

- **DHT11/DHT22**: Temperature and humidity sensor
- **DS18B20**: Temperature sensor (primary)
- **MG811**: CO₂ sensor (analog output)

## WebSocket Configuration

### Default Endpoint

```
ws://localhost:1880/ws/sensors
```

### Expected Payload Format

```json
{
  "airsense/tempDHT": 20.5,
  "airsense/humidity": 45,
  "airsense/tempDS": 21.0,
  "airsense/co2": 267
}
```

### Payload Fields

- `airsense/tempDHT`: Temperature from DHT sensor (°C) or -999 if invalid
- `airsense/humidity`: Relative humidity (%) or -999 if invalid
- `airsense/tempDS`: Temperature from DS18B20 sensor (°C) or -999 if invalid
- `airsense/co2`: Raw ADC value (0-1023) from MG811 CO₂ sensor or -999 if invalid

## CO₂ Sensor Calibration

The MG811 CO₂ sensor outputs an analog voltage that the micro:bit reads as a 10-bit ADC value (0-1023). The platform automatically converts these raw values to ppm (parts per million) using the following calibration:

| Environment          | Approx. Voltage (V) | Raw ADC Value | CO₂ (ppm) |
| -------------------- | ------------------- | ------------- | --------- |
| Fresh air            | 1.0 V               | 310–350       | ~400      |
| Light ventilation    | 1.2 V               | ~370          | ~1000     |
| Moderate ventilation | 1.4 V               | ~430          | ~2000     |
| Poor ventilation     | 1.7 V               | ~530          | ~5000     |

### Conversion Logic

The platform uses piecewise linear interpolation between calibration points to estimate CO₂ concentration in ppm.

See: `lib/sensor-utils.ts` → `convertRawCO2ToPPM()`

## Architecture

### 1. Sensor Utilities (`lib/sensor-utils.ts`)

- `convertRawCO2ToPPM(rawADC)`: Converts raw ADC values to CO₂ ppm
- `processSensorPayload(payload)`: Processes Node-RED WebSocket payload into cleaned sensor data

### 2. WebSocket Hook (`lib/hooks/useNodeRedSensor.ts`)

React hook that manages WebSocket connection lifecycle:

- Auto-connect on mount
- Automatic reconnection with exponential backoff
- Real-time data processing
- Connection state management

#### Usage Example

```typescript
import { useNodeRedSensor } from "@/lib/hooks/useNodeRedSensor";

function MyComponent() {
  const {
    data, // ProcessedSensorData | null
    isConnected, // boolean
    error, // string | null
    connect, // () => void
    disconnect, // () => void
    reconnect, // () => void
  } = useNodeRedSensor({
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });

  return (
    <div>
      {isConnected ? "Connected" : "Disconnected"}
      {data && (
        <div>
          CO₂: {data.co2} ppm Temperature: {data.temperature}°C Humidity:{" "}
          {data.humidity}%
        </div>
      )}
    </div>
  );
}
```

### 3. Live Sensor Card (`app/components/LiveSensorCard.tsx`)

React component that displays real-time sensor data with:

- Live connection indicator
- Sensor readings (CO₂, Temperature, Humidity)
- Air quality score calculation
- Recommendations based on readings
- Error handling and reconnection UI

### 4. Dashboard Integration (`app/dashboard/page.tsx`)

The dashboard displays live sensor data at the top of the page for quick visibility.

## Room Assignment

The Airsense device is assigned to a room via the `sensor_id` field:

```json
{
  "name": "Group Room 1",
  "room_code": "S307",
  "sensor_id": "airsense_device_001"
}
```

This links the live WebSocket data to a specific room in the building hierarchy.

## Air Quality Calculation

Once sensor data is received, the platform calculates an air quality score using:

```typescript
import { calculateAirQuality } from "@/lib/air-quality";

const airQuality = calculateAirQuality(
  temperature, // °C
  humidity, // %
  co2 // ppm
);

// Returns:
// {
//   score: 85,                    // 0-100
//   level: "good",                // "good" | "moderate" | "poor"
//   recommendations: [...]        // Array of suggestions
// }
```

### Scoring Weights

- **CO₂**: 40% weight
- **Temperature**: 30% weight
- **Humidity**: 30% weight

### Thresholds

- **CO₂**:
  - Good: < 800 ppm
  - Moderate: 800-1200 ppm
  - Poor: > 1200 ppm
- **Temperature**:
  - Optimal: 20-24°C
  - Acceptable: 18-26°C
- **Humidity**:
  - Optimal: 40-60%
  - Acceptable: 30-70%

## Node-RED Setup

To use this integration, you need to set up Node-RED with a WebSocket server that:

1. **Receives data from micro:bit** (via serial, MQTT, HTTP, etc.)
2. **Publishes to WebSocket endpoint** at `ws://localhost:1880/ws/sensors`
3. **Sends JSON payloads** in the expected format

Example Node-RED flow configuration is available at: `docs/node-red-flow-example.json`

## Testing

### Manual Testing

1. Ensure Node-RED is running at `http://localhost:1880`
2. Configure the WebSocket endpoint to send test data
3. Open the dashboard at `/dashboard`
4. The Live Sensor Feed should show real-time data

### Test Payload

Send this via Node-RED WebSocket:

```json
{
  "airsense/tempDHT": 22.5,
  "airsense/humidity": 48,
  "airsense/tempDS": 22.0,
  "airsense/co2": 350
}
```

Expected result:

- Temperature: ~22°C
- Humidity: 48%
- CO₂: ~400 ppm
- Quality: Good

## Troubleshooting

### Connection Errors

- **Check Node-RED is running**: Visit `http://localhost:1880`
- **Verify WebSocket endpoint**: Ensure `/ws/sensors` exists in Node-RED
- **Check firewall**: Allow WebSocket connections on port 1880
- **Browser console**: Look for WebSocket connection errors

### Invalid Data

- **-999 values**: Indicates sensor failure or disconnection
- **Check micro:bit**: Ensure all sensors are properly connected
- **Sensor calibration**: CO₂ sensors may need warm-up time (~24 hours)

### Reconnection Issues

The hook will automatically attempt to reconnect up to 10 times with a 5-second interval. If all attempts fail:

1. Check Node-RED logs
2. Restart Node-RED service
3. Click "Try Reconnecting" button in the UI

## Future Enhancements

- [ ] Support multiple Airsense devices simultaneously
- [ ] Store WebSocket data to database for historical analysis
- [ ] Add configuration UI for WebSocket endpoint
- [ ] Implement sensor data visualization (charts/graphs)
- [ ] Add alerts/notifications for poor air quality
- [ ] Support secure WebSocket (wss://) for production
