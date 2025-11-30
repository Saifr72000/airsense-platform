# WebSocket Integration Implementation Summary

## ✅ Completed Tasks

### 1. Updated Seed Data

**File**: `seed.json`

- Updated "Group Room 1 S307" to use `sensor_id: "airsense_device_001"`
- This links the live WebSocket feed to this specific room

### 2. Created CO2 Conversion Utility

**File**: `lib/sensor-utils.ts`

- `convertRawCO2ToPPM()` - Converts raw ADC values (0-1023) to CO₂ ppm using piecewise linear interpolation
- `processSensorPayload()` - Processes Node-RED WebSocket payloads into clean sensor data
- Handles invalid readings (-999) gracefully
- Uses calibration data:
  - Fresh air (~400 ppm): ADC ~310-350
  - 1000 ppm: ADC ~370
  - 2000 ppm: ADC ~430
  - 5000 ppm: ADC ~530

### 3. Created WebSocket Hook

**File**: `lib/hooks/useNodeRedSensor.ts`

- Custom React hook for WebSocket connection management
- Features:
  - Auto-connect on mount
  - Automatic reconnection with configurable attempts (default: 10)
  - Connection state tracking
  - Error handling
  - Real-time data processing
  - Clean disconnect on unmount
- Connects to: `ws://localhost:1880/ws/sensors`

### 4. Created Live Sensor Card Component

**File**: `app/components/LiveSensorCard.tsx`

- Displays real-time sensor data with beautiful UI
- Shows:
  - Connection status (live/disconnected)
  - CO₂ (in ppm) + raw ADC value
  - Temperature (°C)
  - Humidity (%)
  - Air quality score (0-100)
  - Quality level badge (Good/Moderate/Poor)
  - Smart recommendations
- Error handling with reconnect button
- Responsive grid layout

### 5. Updated Dashboard

**File**: `app/dashboard/page.tsx`

- Added "Live Sensor Feed" section at the top
- Integrates `useNodeRedSensor` hook
- Displays live data for Group Room 1 S307
- Shows real-time updates as WebSocket messages arrive

### 6. Documentation

**Files**:

- `docs/WEBSOCKET_INTEGRATION.md` - Complete WebSocket integration guide
- Updated `README.md` with WebSocket features and architecture

## 📊 Data Flow

```
Airsense Device (micro:bit)
    ↓
  Serial/MQTT
    ↓
Node-RED WebSocket Server (ws://localhost:1880/ws/sensors)
    ↓
WebSocket Message:
{
  "airsense/tempDHT": -999,
  "airsense/humidity": 45,
  "airsense/tempDS": 20.5,
  "airsense/co2": 267
}
    ↓
useNodeRedSensor Hook
    ↓
processSensorPayload()
    ↓
Processed Data:
{
  temperature: 20.5,
  humidity: 45,
  co2: 400,        // Converted from ADC 267
  rawCO2: 267,
  isValid: true
}
    ↓
calculateAirQuality()
    ↓
Live Display on Dashboard
```

## 🎯 Features Implemented

1. **Real-time Data Streaming** - WebSocket connection for instant updates
2. **CO₂ Conversion** - Automatic ADC to ppm conversion using calibration data
3. **Air Quality Calculation** - Weighted scoring (CO₂ 40%, Temp 30%, Humidity 30%)
4. **Smart Recommendations** - Context-aware suggestions based on readings
5. **Connection Management** - Auto-reconnect with exponential backoff
6. **Error Handling** - Graceful degradation when connection fails
7. **Visual Indicators** - Live/disconnected status with color coding
8. **Responsive UI** - Works on all screen sizes

## 🔧 Configuration

### WebSocket Endpoint

Default: `ws://localhost:1880/ws/sensors`

Can be customized in the hook:

```typescript
useNodeRedSensor({
  wsUrl: "ws://your-server:port/path",
  autoConnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
});
```

### Sensor Assignment

In seed data or database:

```json
{
  "sensor_id": "airsense_device_001"
}
```

## 📝 Testing

### Expected WebSocket Payload

```json
{
  "airsense/tempDHT": -999,
  "airsense/humidity": 48,
  "airsense/tempDS": 22.0,
  "airsense/co2": 350
}
```

### Expected Result

- Temperature: 22.0°C (using DS18B20)
- Humidity: 48%
- CO₂: ~400 ppm (converted from ADC 350)
- Quality: Good

## 🚀 Next Steps

1. Start Node-RED with WebSocket server
2. Configure flow to publish to `ws://localhost:1880/ws/sensors`
3. Connect Airsense device to Node-RED
4. Open dashboard at `/dashboard`
5. Watch live data stream in!

## 📚 Documentation References

- [WebSocket Integration Guide](docs/WEBSOCKET_INTEGRATION.md)
- [Node-RED Integration](docs/NODE_RED_INTEGRATION.md)
- [API Reference](docs/API_REFERENCE.md)

---

**All features implemented and ready to use! 🎉**
