# Database Migrations

This document contains SQL migrations to add the building hierarchy to the AirSense platform.

## Migration 1: Create Buildings Table

Run this migration first to create the buildings table:

```sql
-- Create buildings table
CREATE TABLE buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_buildings_user_id ON buildings(user_id);
CREATE INDEX idx_buildings_code ON buildings(code);

-- Enable Row Level Security
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for buildings
CREATE POLICY "Buildings are viewable by everyone" ON buildings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own buildings" ON buildings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own buildings" ON buildings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own buildings" ON buildings
  FOR DELETE USING (auth.uid() = user_id);
```

## Migration 2: Add building_id to Rooms Table

**IMPORTANT**: Before running this migration, you must:
1. Create at least one building in your database
2. Note the building ID to use as default for existing rooms

```sql
-- Step 1: Add building_id column (nullable initially)
ALTER TABLE rooms 
ADD COLUMN building_id UUID REFERENCES buildings(id) ON DELETE CASCADE;

-- Step 2: Create index
CREATE INDEX idx_rooms_building_id ON rooms(building_id);

-- Step 3: Update existing rooms to belong to a building
-- Replace 'YOUR_BUILDING_ID_HERE' with the actual building ID
UPDATE rooms 
SET building_id = 'YOUR_BUILDING_ID_HERE' 
WHERE building_id IS NULL;

-- Step 4: Make building_id required
ALTER TABLE rooms 
ALTER COLUMN building_id SET NOT NULL;
```

## Migration 3: Update RLS Policies

The existing RLS policies for rooms will automatically work with the building_id foreign key due to CASCADE constraints.

---

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration script
4. Click **Run** to execute

### Option 2: Using Supabase CLI

```bash
# Create a new migration file
supabase migration new add_buildings_table

# Add the SQL to the migration file
# Then apply the migration
supabase db push
```

### Option 3: Using MCP Tools (if available)

If you have Supabase MCP tools configured, you can use:

```javascript
// Apply migration
await mcp_supabase_apply_migration({
  project_id: "your-project-id",
  name: "create_buildings_table",
  query: "-- SQL here"
});
```

---

## Rollback Instructions

If you need to rollback these changes:

```sql
-- Remove building_id from rooms
ALTER TABLE rooms DROP COLUMN building_id;

-- Drop buildings table
DROP TABLE buildings CASCADE;
```

**Warning**: Rolling back will delete all building data permanently.

---

## Post-Migration Steps

After running the migrations:

1. Create your campus buildings in the dashboard
2. Assign existing rooms to appropriate buildings
3. Test the room creation flow with building selection
4. Verify that the public homepage groups rooms by building

---

## Verification Queries

Check that the migrations were successful:

```sql
-- Check buildings table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'buildings'
ORDER BY ordinal_position;

-- Check rooms table for building_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms'
AND column_name = 'building_id';

-- Check RLS policies for buildings
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'buildings';

-- List all buildings
SELECT id, name, code, address, created_at 
FROM buildings
ORDER BY created_at DESC;

-- Check rooms with buildings
SELECT 
  r.id,
  r.name as room_name,
  r.room_code,
  b.name as building_name,
  b.code as building_code
FROM rooms r
JOIN buildings b ON b.id = r.building_id
ORDER BY b.name, r.room_code;
```

---

## Troubleshooting

### Error: "violates foreign key constraint"

This means you're trying to create a room without a valid building_id. Make sure:
1. The building exists
2. You're passing the correct building_id

### Error: "column building_id cannot be null"

This occurs if you try to run Migration 2 Step 4 before updating existing rooms with a building_id. Follow the steps in order.

### Missing Building Data

If rooms don't have building information:
1. Check that building_id is populated: `SELECT * FROM rooms WHERE building_id IS NULL;`
2. Update any rooms with NULL building_id to a valid building

