# Public Homepage Live Data Implementation

## ✅ What Was Implemented

Successfully integrated real-time WebSocket sensor data into the **public homepage** (`app/page.tsx`), so all visitors can see live air quality readings.

### Features Added:

1. **WebSocket Integration**

   - Added `useNodeRedSensor` hook to public homepage
   - Connects to `ws://localhost:1880/ws/sensors`
   - Real-time data streaming to all visitors

2. **Live Data Matching**

   - Created `getRoomData()` helper function
   - Matches live sensor data to rooms by `sensor_id`
   - Currently supports `airsense_device_001` → Group Room 1 S307
   - Falls back to database data if no live sensor available

3. **Room Cards**

   - Display live data when sensor is connected
   - Show "🟢 Live" indicator for real-time rooms
   - Update readings instantly as WebSocket messages arrive
   - Show "Updated just now" for live data
   - Handle invalid sensors gracefully (N/A for missing readings)

4. **Room Modal**
   - Detailed view shows live data
   - Air Quality Score updates in real-time
   - Sensor readings (CO₂, Temperature, Humidity)
   - AI Tips based on current readings
   - Live indicator in modal header

## 🔄 How It Works

### Data Flow:

```
Airsense Device → Node-RED → WebSocket → Homepage
                                            ↓
                                   getRoomData()
                                            ↓
                              Match by sensor_id
                                            ↓
                          Room Card + Modal (Live!)
```

### Sensor Matching Logic:

```typescript
// Check if room has the live sensor
const hasLiveSensor =
  room.sensor_id === "airsense_device_001" &&
  liveSensorData &&
  liveSensorData.isValid &&
  isSensorConnected;
```

### Fallback Strategy:

- **Live sensor available?** → Use real-time WebSocket data
- **No live sensor?** → Use database data (last reading)
- **No data at all?** → Show "No sensor data available"

## 📊 Live Data Display

### Room Cards Show:

- ✅ Live indicator ("🟢 Live")
- ✅ Real-time CO₂ (ppm)
- ✅ Real-time Temperature (°C)
- ✅ Real-time Humidity (%) or "N/A" if sensor fails
- ✅ Air Quality badge (Good/Moderate/Poor)
- ✅ "Updated just now" timestamp

### Room Modal Shows:

- ✅ Live indicator in header
- ✅ Air Quality Score with progress bar
- ✅ Large sensor readings with icons
- ✅ AI Tips based on current conditions
- ✅ "Updated just now" for live data

## 🎯 Adding More Sensors

To add more Airsense devices:

### Step 1: Assign sensor_id in database

```sql
UPDATE rooms
SET sensor_id = 'airsense_device_002'
WHERE room_code = 'S401';
```

### Step 2: Update getRoomData() (if needed)

Currently matches `airsense_device_001`, but can be extended for multiple sensors:

```typescript
const hasLiveSensor =
  room.sensor_id && // Has a sensor_id
  room.sensor_id.startsWith("airsense_device_") && // Is an Airsense device
  liveSensorData &&
  liveSensorData.isValid &&
  isSensorConnected;
```

### Step 3: Multiple WebSocket Endpoints (Future)

For multiple devices, you could:

- Use different WebSocket paths per device
- Use a single path and include device ID in payload
- Implement WebSocket multiplexing

## 🔧 Configuration

### Current Settings:

- **WebSocket URL**: `ws://localhost:1880/ws/sensors`
- **Reconnect Interval**: 3 seconds
- **Max Reconnect Attempts**: 5
- **Auto-connect**: Yes

### Sensor Assignment:

- **Group Room 1 S307**: `airsense_device_001` ✅ (Live)
- **Study Hall S401**: No sensor assigned
- **Conference Room S201**: No sensor assigned

## 🎨 Visual Indicators

### Live Badge:

```
🟢 Live
```

- Green pulsing dot
- "Live" text in green
- Appears next to room code

### Status Colors:

- **Good**: `#BCF4A8` (Green)
- **Moderate**: `#FFAF76` (Orange)
- **Poor**: `#F25E5E` (Red)

## 🚀 Benefits

1. **Real-time Visibility** - All visitors see current air quality
2. **No Authentication Required** - Public access to live data
3. **Graceful Degradation** - Works with or without live sensors
4. **Scalable** - Easy to add more sensors
5. **Beautiful UI** - Live indicators and smooth updates

## 📝 Files Modified

- `app/page.tsx` - Main homepage with live data integration
- All existing utilities reused (no new files needed!)

## ✅ Testing Checklist

- [x] Live data appears on room cards
- [x] Live indicator shows on connected rooms
- [x] Modal displays live data
- [x] Fallback to database data works
- [x] Invalid sensors handled gracefully
- [x] "Updated just now" timestamp for live data
- [x] Air quality calculation from live data
- [x] No linter errors

---

**Status: ✅ Complete and Working!**
