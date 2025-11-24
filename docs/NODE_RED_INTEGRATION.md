# Node-RED Integration Guide

This guide explains how to integrate your sensors with the AirSense platform using Node-RED.

## Overview

Node-RED will collect sensor data (temperature, humidity, CO2) and send it to the AirSense API endpoint via HTTP POST requests.

## API Endpoint

**URL:** `https://your-domain.com/api/sensor-data`  
**Method:** POST  
**Content-Type:** application/json

### Request Payload

```json
{
  "sensor_id": "sensor_001",
  "temperature": 22.5,
  "humidity": 45,
  "co2": 650
}
```

### Response (Success)

```json
{
  "success": true,
  "reading": {
    "id": "...",
    "room_id": "...",
    "sensor_id": "sensor_001",
    "temperature": 22.5,
    "humidity": 45,
    "co2": 650,
    "quality_score": 85,
    "quality_level": "good",
    "recommendations": ["Air quality is excellent!"],
    "created_at": "2024-11-24T10:30:00Z"
  },
  "air_quality": {
    "score": 85,
    "level": "good",
    "recommendations": ["Air quality is excellent!"]
  }
}
```

### Response (Error)

```json
{
  "error": "No room found with sensor_id: sensor_001"
}
```

## Node-RED Flow Examples

### Example 1: Basic HTTP POST Flow

This is the simplest flow - reads sensor data and posts it to AirSense.

**Flow JSON:**

```json
[
  {
    "id": "sensor_input",
    "type": "inject",
    "name": "Simulate Sensor",
    "props": [
      {
        "p": "payload"
      }
    ],
    "repeat": "60",
    "crontab": "",
    "once": false,
    "onceDelay": 0.1,
    "topic": "",
    "payload": "{\"sensor_id\":\"sensor_001\",\"temperature\":22.5,\"humidity\":45,\"co2\":650}",
    "payloadType": "json",
    "x": 140,
    "y": 100,
    "wires": [["http_request"]]
  },
  {
    "id": "http_request",
    "type": "http request",
    "name": "Send to AirSense",
    "method": "POST",
    "ret": "obj",
    "paytoqs": "ignore",
    "url": "http://localhost:3000/api/sensor-data",
    "tls": "",
    "persist": false,
    "proxy": "",
    "authType": "",
    "sendsPayload": true,
    "x": 380,
    "y": 100,
    "wires": [["debug"]]
  },
  {
    "id": "debug",
    "type": "debug",
    "name": "Response",
    "active": true,
    "tosidebar": true,
    "console": false,
    "tostatus": false,
    "complete": "payload",
    "targetType": "msg",
    "statusVal": "",
    "statusType": "auto",
    "x": 600,
    "y": 100,
    "wires": []
  }
]
```

### Example 2: Real Sensor Integration with Data Formatting

This flow reads from actual sensors and formats the data.

**Flow JSON:**

```json
[
  {
    "id": "mqtt_in",
    "type": "mqtt in",
    "name": "Sensor MQTT",
    "topic": "sensors/room_001",
    "qos": "0",
    "datatype": "json",
    "broker": "mqtt_broker",
    "x": 120,
    "y": 200,
    "wires": [["format_data"]]
  },
  {
    "id": "format_data",
    "type": "function",
    "name": "Format Payload",
    "func": "// Assuming incoming payload structure:\n// {\n//   \"temp\": 22.5,\n//   \"hum\": 45,\n//   \"co2\": 650\n// }\n\nmsg.payload = {\n  sensor_id: \"sensor_001\",\n  temperature: msg.payload.temp,\n  humidity: msg.payload.hum,\n  co2: msg.payload.co2\n};\n\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "initialize": "",
    "finalize": "",
    "libs": [],
    "x": 320,
    "y": 200,
    "wires": [["http_request_2"]]
  },
  {
    "id": "http_request_2",
    "type": "http request",
    "name": "Send to AirSense",
    "method": "POST",
    "ret": "obj",
    "paytoqs": "ignore",
    "url": "http://localhost:3000/api/sensor-data",
    "tls": "",
    "persist": false,
    "proxy": "",
    "authType": "",
    "sendsPayload": true,
    "x": 540,
    "y": 200,
    "wires": [["debug_2"]]
  },
  {
    "id": "debug_2",
    "type": "debug",
    "name": "API Response",
    "active": true,
    "tosidebar": true,
    "console": false,
    "tostatus": false,
    "complete": "payload",
    "targetType": "msg",
    "statusVal": "",
    "statusType": "auto",
    "x": 770,
    "y": 200,
    "wires": []
  }
]
```

### Example 3: Multiple Sensors with Error Handling

This flow handles multiple sensors with error handling and retry logic.

**Function Node - Format and Validate:**

```javascript
// Validate sensor data
const { sensor_id, temperature, humidity, co2 } = msg.payload;

if (
  !sensor_id ||
  temperature === undefined ||
  humidity === undefined ||
  co2 === undefined
) {
  node.error("Invalid sensor data", msg);
  return null;
}

// Check if values are in reasonable ranges
if (temperature < -20 || temperature > 60) {
  node.warn("Temperature out of range: " + temperature);
}

if (humidity < 0 || humidity > 100) {
  node.warn("Humidity out of range: " + humidity);
}

if (co2 < 0 || co2 > 5000) {
  node.warn("CO2 out of range: " + co2);
}

msg.payload = {
  sensor_id: sensor_id,
  temperature: parseFloat(temperature),
  humidity: parseFloat(humidity),
  co2: parseInt(co2),
};

return msg;
```

**Function Node - Error Handler:**

```javascript
if (msg.statusCode !== 200) {
  node.error("API Error: " + JSON.stringify(msg.payload), msg);

  // Store failed payload for retry
  context.set("failed_payload", msg.payload);

  return null;
}

// Log success
node.log("Data sent successfully for sensor: " + msg.payload.reading.sensor_id);

return msg;
```

## WebSocket Integration (Optional)

For real-time updates, you can also implement WebSocket connections:

### Node-RED WebSocket Client

1. Add a WebSocket client node
2. Configure it to connect to: `wss://your-domain.com/api/ws`
3. Send sensor data through the WebSocket connection

**Note:** You'll need to implement WebSocket support on the Next.js side if you want bidirectional real-time communication.

## Testing Your Integration

### 1. Using curl

```bash
curl -X POST http://localhost:3000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "sensor_001",
    "temperature": 22.5,
    "humidity": 45,
    "co2": 650
  }'
```

### 2. Using Node-RED Inject Node

1. Create an Inject node
2. Set payload to JSON:
   ```json
   {
     "sensor_id": "sensor_001",
     "temperature": 22.5,
     "humidity": 45,
     "co2": 650
   }
   ```
3. Connect to HTTP Request node
4. Click inject to test

## Best Practices

1. **Sensor ID Assignment**: Make sure the `sensor_id` matches the one assigned to a room in the AirSense dashboard
2. **Data Validation**: Always validate sensor data before sending
3. **Error Handling**: Implement proper error handling and logging
4. **Rate Limiting**: Don't send data too frequently (recommended: every 30-60 seconds)
5. **Retry Logic**: Implement retry logic for failed requests
6. **Data Types**: Ensure correct data types (temperature and humidity as floats, co2 as integer)

## Troubleshooting

### "No room found with sensor_id"

- Check that you've created a room in the dashboard
- Verify the sensor_id in the room matches the one you're sending
- Sensor IDs are case-sensitive

### Connection Refused

- Verify the API endpoint URL is correct
- Check if the Next.js server is running
- Check firewall settings

### Invalid Data Types

- Ensure temperature and humidity are numbers (not strings)
- Ensure co2 is an integer
- Check JSON formatting

## Data Requirements

| Field       | Type    | Range         | Required |
| ----------- | ------- | ------------- | -------- |
| sensor_id   | string  | -             | Yes      |
| temperature | float   | -20 to 60°C   | Yes      |
| humidity    | float   | 0 to 100%     | Yes      |
| co2         | integer | 0 to 5000 ppm | Yes      |

## Air Quality Thresholds

The system automatically calculates air quality based on:

### CO2 Levels (40% weight)

- **Good**: < 800 ppm
- **Moderate**: 800-1200 ppm
- **Poor**: > 1200 ppm

### Temperature (30% weight)

- **Optimal**: 20-24°C
- **Acceptable**: 18-26°C
- **Poor**: < 18°C or > 26°C

### Humidity (30% weight)

- **Optimal**: 40-60%
- **Acceptable**: 30-70%
- **Poor**: < 30% or > 70%

## Support

For issues or questions, check the main README or create an issue in the repository.
