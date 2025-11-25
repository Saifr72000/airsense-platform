# Building Hierarchy Implementation Guide

This guide explains the building hierarchy that has been added to the AirSense platform.

## What Changed?

The platform now has a **two-level hierarchy**:
- **Buildings** (e.g., Smaragd Building, Main Hall)
  - **Rooms** (e.g., S307, Group Room 1)

Before, you could only create rooms. Now you must first create a building, then add rooms to that building.

## Changes Made

### 1. Database Schema ✅
- Added `buildings` table with columns: `id`, `name`, `code`, `address`, `user_id`, `created_at`, `updated_at`
- Updated `rooms` table to include `building_id` foreign key
- Added proper indexes and Row Level Security (RLS) policies

### 2. TypeScript Types ✅
- Added `Building` interface
- Updated `Room` interface to include `building_id`
- Added `BuildingWithRooms` interface for grouping

### 3. API Endpoints ✅
Created new endpoints:
- `GET /api/buildings` - List all buildings
- `POST /api/buildings` - Create a new building
- `GET /api/buildings/[id]` - Get a building with its rooms
- `PATCH /api/buildings/[id]` - Update a building
- `DELETE /api/buildings/[id]` - Delete a building (cascades to rooms)

Updated existing:
- `POST /api/rooms` - Now requires `building_id` parameter

### 4. Dashboard UI ✅
The dashboard (`/dashboard`) now has:
- **Two buttons**: "Add Building" and "Add Room"
- Buildings are displayed as sections with their rooms grouped inside
- Room creation modal includes a building selector dropdown
- Building management (create, edit, delete)

### 5. Public Homepage ✅
The homepage (`/`) now:
- Groups rooms by building
- Displays building name, code, and address
- Shows room counts per building
- Maintains all existing room card functionality

## What You Need to Do

### Step 1: Run Database Migrations ⚠️ REQUIRED

You **must** run the SQL migrations in Supabase before the app will work:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open [`docs/MIGRATIONS.md`](./MIGRATIONS.md)
4. Run **Migration 1** first (creates buildings table)
5. Create at least one building using the app or SQL
6. Run **Migration 2** (adds building_id to rooms)
   - **Important**: Replace `'YOUR_BUILDING_ID_HERE'` with an actual building ID
7. Test the application

### Step 2: Create Your Buildings

After migrations:

1. Log in to the dashboard (`/dashboard`)
2. Click **"+ Add Building"**
3. Fill in:
   - **Building Name**: e.g., "Smaragd Building"
   - **Building Code**: e.g., "SMR"
   - **Address** (optional): e.g., "Gløshaugen Campus"
4. Click **Create**

### Step 3: Update Existing Rooms (if any)

If you had existing rooms before this change:
- They are now associated with the default building (set in Migration 2)
- You can edit each room and move it to the correct building if needed

### Step 4: Create New Rooms

1. Click **"+ Add Room"**
2. Select the building from the dropdown
3. Fill in room details (name, code, sensor ID)
4. Click **Create**

## File Structure

```
app/
├── api/
│   ├── buildings/
│   │   ├── route.ts              # New: Building CRUD endpoints
│   │   └── [id]/route.ts         # New: Single building operations
│   └── rooms/
│       └── route.ts              # Updated: Now requires building_id
├── dashboard/
│   └── page.tsx                  # Updated: Building & room management
└── page.tsx                      # Updated: Groups rooms by building

lib/
└── types.ts                      # Updated: Added Building interfaces

docs/
├── MIGRATIONS.md                 # New: SQL migration scripts
├── BUILDING_HIERARCHY_GUIDE.md   # This file
└── DATABASE_SCHEMA.md            # Updated: Documents new structure
```

## API Examples

### Create a Building

```bash
POST /api/buildings
Content-Type: application/json

{
  "name": "Smaragd Building",
  "code": "SMR",
  "address": "Gløshaugen Campus"
}
```

### Create a Room

```bash
POST /api/rooms
Content-Type: application/json

{
  "name": "Group Room 1",
  "room_code": "S307",
  "building_id": "uuid-of-building",
  "sensor_id": "sensor_001"
}
```

### Get Building with Rooms

```bash
GET /api/buildings/{building-id}
```

Returns:
```json
{
  "id": "uuid",
  "name": "Smaragd Building",
  "code": "SMR",
  "address": "Gløshaugen Campus",
  "rooms": [
    {
      "id": "uuid",
      "name": "Group Room 1",
      "room_code": "S307",
      "building_id": "building-uuid",
      "sensor_id": "sensor_001",
      "latest_reading": { ... }
    }
  ]
}
```

## Node-RED Integration

If you're using Node-RED to send sensor data, **no changes required**! The `/api/sensor-data` endpoint still works the same way:

```json
POST /api/sensor-data
{
  "sensor_id": "sensor_001",
  "temperature": 22.5,
  "humidity": 45,
  "co2": 650
}
```

The system will automatically find the room by `sensor_id`, regardless of which building it's in.

## Benefits of This Structure

1. **Better Organization**: Rooms are logically grouped by building
2. **Scalability**: Easy to manage multiple campus buildings
3. **Clearer Navigation**: Users can quickly find rooms in specific buildings
4. **Data Integrity**: Cascade deletes ensure no orphaned rooms
5. **Flexible**: Can add building-level features later (alerts, analytics, etc.)

## Troubleshooting

### "Cannot create room without building_id"
- Make sure you've created at least one building first
- Check that the building_id is valid in the room creation form

### "Building not found" error
- Verify the building exists: `SELECT * FROM buildings;`
- Check that you're authenticated as the building owner

### Existing rooms not showing up
- Run Migration 2 to add building_id to existing rooms
- Verify all rooms have a building_id: `SELECT * FROM rooms WHERE building_id IS NULL;`

### Rooms show in wrong building
- Edit the room in the dashboard
- The building association cannot be changed (by design for data integrity)
- You may need to delete and recreate the room in the correct building

## Future Enhancements

Possible features to add:
- Building-level statistics and analytics
- Floor management (sub-level between building and room)
- Building photos/images
- Building-specific alerts and notifications
- Capacity limits per building
- Operating hours per building

## Questions?

Refer to:
- [`MIGRATIONS.md`](./MIGRATIONS.md) - SQL migration scripts
- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) - Complete schema documentation
- [`API_REFERENCE.md`](./API_REFERENCE.md) - API endpoint documentation

