# API Reference

Complete API documentation for the AirSense platform.

## Base URL

```
http://localhost:3000/api  # Development
https://your-domain.com/api  # Production
```

## Authentication

Most endpoints use Supabase Auth. Include the session cookie or Authorization header for authenticated requests.

---

## Endpoints

### Sensor Data

#### POST `/api/sensor-data`

Submit sensor readings from Node-RED or other IoT devices.

**Authentication:** Public (uses service role internally)

**Request Body:**

```json
{
  "sensor_id": "string (required)",
  "temperature": "number (required)",
  "humidity": "number (required)",
  "co2": "number (required)"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "reading": {
    "id": "uuid",
    "room_id": "uuid",
    "sensor_id": "string",
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

**Error Responses:**

- `400 Bad Request` - Missing or invalid fields

```json
{
  "error": "Missing required fields: sensor_id, temperature, humidity, co2"
}
```

- `404 Not Found` - No room with this sensor_id

```json
{
  "error": "No room found with sensor_id: sensor_001"
}
```

- `500 Internal Server Error` - Server error

```json
{
  "error": "Failed to save sensor reading"
}
```

#### GET `/api/sensor-data`

Get information about the sensor data API.

**Response (200):**

```json
{
  "message": "AirSense Sensor Data API",
  "usage": "POST sensor data with: { sensor_id, temperature, humidity, co2 }",
  "example": {
    "sensor_id": "sensor_001",
    "temperature": 22.5,
    "humidity": 45,
    "co2": 650
  }
}
```

---

### Rooms

#### GET `/api/rooms`

Get all rooms with their latest sensor readings.

**Authentication:** Public

**Query Parameters:** None

**Success Response (200):**

```json
[
  {
    "id": "uuid",
    "name": "Group Room 1",
    "room_code": "S307",
    "sensor_id": "sensor_001",
    "user_id": "uuid",
    "created_at": "2024-11-24T10:00:00Z",
    "updated_at": "2024-11-24T10:00:00Z",
    "latest_reading": {
      "id": "uuid",
      "room_id": "uuid",
      "sensor_id": "sensor_001",
      "temperature": 22.5,
      "humidity": 45,
      "co2": 650,
      "quality_score": 85,
      "quality_level": "good",
      "recommendations": ["Air quality is excellent!"],
      "created_at": "2024-11-24T10:30:00Z"
    }
  }
]
```

#### POST `/api/rooms`

Create a new room.

**Authentication:** Required

**Request Body:**

```json
{
  "name": "string (required)",
  "room_code": "string (required)",
  "sensor_id": "string (optional)"
}
```

**Success Response (200):**

```json
{
  "id": "uuid",
  "name": "Group Room 1",
  "room_code": "S307",
  "sensor_id": "sensor_001",
  "user_id": "uuid",
  "created_at": "2024-11-24T10:00:00Z",
  "updated_at": "2024-11-24T10:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated

```json
{
  "error": "Unauthorized"
}
```

- `400 Bad Request` - Missing required fields

```json
{
  "error": "Missing required fields: name, room_code"
}
```

#### GET `/api/rooms/[id]`

Get a specific room by ID with its latest reading.

**Authentication:** Public

**URL Parameters:**

- `id` - Room UUID

**Success Response (200):**

```json
{
  "id": "uuid",
  "name": "Group Room 1",
  "room_code": "S307",
  "sensor_id": "sensor_001",
  "user_id": "uuid",
  "created_at": "2024-11-24T10:00:00Z",
  "updated_at": "2024-11-24T10:00:00Z",
  "latest_reading": {
    "id": "uuid",
    "room_id": "uuid",
    "sensor_id": "sensor_001",
    "temperature": 22.5,
    "humidity": 45,
    "co2": 650,
    "quality_score": 85,
    "quality_level": "good",
    "recommendations": ["Air quality is excellent!"],
    "created_at": "2024-11-24T10:30:00Z"
  }
}
```

**Error Response:**

- `404 Not Found` - Room doesn't exist

```json
{
  "error": "Room not found"
}
```

#### PATCH `/api/rooms/[id]`

Update a room (only name and sensor_id can be updated).

**Authentication:** Required (must be room owner)

**URL Parameters:**

- `id` - Room UUID

**Request Body:**

```json
{
  "name": "string (optional)",
  "sensor_id": "string (optional)"
}
```

**Success Response (200):**

```json
{
  "id": "uuid",
  "name": "Updated Room Name",
  "room_code": "S307",
  "sensor_id": "sensor_002",
  "user_id": "uuid",
  "created_at": "2024-11-24T10:00:00Z",
  "updated_at": "2024-11-24T11:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated

```json
{
  "error": "Unauthorized"
}
```

- `500 Internal Server Error` - Update failed (likely not room owner)

```json
{
  "error": "Failed to update room"
}
```

#### DELETE `/api/rooms/[id]`

Delete a room and all its sensor readings.

**Authentication:** Required (must be room owner)

**URL Parameters:**

- `id` - Room UUID

**Success Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated

```json
{
  "error": "Unauthorized"
}
```

- `500 Internal Server Error` - Delete failed

```json
{
  "error": "Failed to delete room"
}
```

---

## Data Models

### Room

```typescript
{
  id: string; // UUID
  name: string; // Room name
  room_code: string; // Unique room code (e.g., "S307")
  sensor_id: string | null; // Associated sensor ID
  user_id: string; // Owner's user ID
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

### Sensor Reading

```typescript
{
  id: string                    // UUID
  room_id: string               // Associated room UUID
  sensor_id: string             // Sensor identifier
  temperature: number           // Temperature in °C
  humidity: number              // Humidity in %
  co2: number                   // CO2 in ppm
  quality_score: number | null  // Score 0-100
  quality_level: 'good' | 'moderate' | 'poor' | null
  recommendations: string[] | null // Suggestions
  created_at: string            // ISO 8601 timestamp
}
```

### Air Quality Result

```typescript
{
  score: number                 // 0-100
  level: 'good' | 'moderate' | 'poor'
  recommendations: string[]     // Array of suggestions
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. For production:

- Recommended: 1 reading per sensor per 30-60 seconds
- Burst limit: 10 requests per minute per sensor

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## CORS

CORS is enabled for all origins in development. Configure appropriately for production.

---

## Examples

### cURL Example - Submit Sensor Data

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

### JavaScript Example - Fetch Rooms

```javascript
const response = await fetch("/api/rooms");
const rooms = await response.json();
console.log(rooms);
```

### JavaScript Example - Create Room

```javascript
const response = await fetch("/api/rooms", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "My Room",
    room_code: "R101",
    sensor_id: "sensor_001",
  }),
});
const room = await response.json();
```

---

## Webhooks (Future Feature)

Webhooks for real-time notifications are planned for future releases.

---

## Support

For API issues, check:

1. Request format matches documentation
2. Authentication headers are correct
3. Supabase service is running
4. Check server logs for detailed errors
