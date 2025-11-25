# Database Schema

AirSense uses PostgreSQL via Supabase with Row Level Security (RLS) enabled.

## Tables

### `buildings`

Stores building information for campus locations.

```sql
CREATE TABLE buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**

```sql
CREATE INDEX idx_buildings_user_id ON buildings(user_id);
CREATE INDEX idx_buildings_code ON buildings(code);
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| name | TEXT | NOT NULL | Building name (e.g., "Smaragd Building") |
| code | TEXT | NOT NULL, UNIQUE | Building code (e.g., "SMR") |
| address | TEXT | NULL | Physical address |
| user_id | UUID | FOREIGN KEY → auth.users | Building creator |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**RLS Policies:**

```sql
-- Everyone can view buildings
CREATE POLICY "Buildings are viewable by everyone" ON buildings
  FOR SELECT USING (true);

-- Users can insert their own buildings
CREATE POLICY "Users can insert their own buildings" ON buildings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own buildings
CREATE POLICY "Users can update their own buildings" ON buildings
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own buildings
CREATE POLICY "Users can delete their own buildings" ON buildings
  FOR DELETE USING (auth.uid() = user_id);
```

---

### `rooms`

Stores room information and sensor assignments.

```sql
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  room_code TEXT NOT NULL UNIQUE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  sensor_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**

```sql
CREATE INDEX idx_rooms_user_id ON rooms(user_id);
CREATE INDEX idx_rooms_sensor_id ON rooms(sensor_id);
CREATE INDEX idx_rooms_building_id ON rooms(building_id);
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| name | TEXT | NOT NULL | Display name (e.g., "Group Room 1") |
| room_code | TEXT | NOT NULL, UNIQUE | Room code (e.g., "S307") |
| building_id | UUID | FOREIGN KEY → buildings, NOT NULL | Parent building |
| sensor_id | TEXT | NULL | Associated sensor device ID |
| user_id | UUID | FOREIGN KEY → auth.users | Room owner |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**RLS Policies:**

```sql
-- Everyone can view rooms
CREATE POLICY "Rooms are viewable by everyone" ON rooms
  FOR SELECT USING (true);

-- Users can insert their own rooms
CREATE POLICY "Users can insert their own rooms" ON rooms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own rooms
CREATE POLICY "Users can update their own rooms" ON rooms
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own rooms
CREATE POLICY "Users can delete their own rooms" ON rooms
  FOR DELETE USING (auth.uid() = user_id);
```

---

### `sensor_readings`

Stores sensor data readings with calculated air quality metrics.

```sql
CREATE TABLE sensor_readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  sensor_id TEXT NOT NULL,
  temperature DECIMAL(5,2) NOT NULL,
  humidity DECIMAL(5,2) NOT NULL,
  co2 INTEGER NOT NULL,
  quality_score INTEGER,
  quality_level TEXT CHECK (quality_level IN ('good', 'moderate', 'poor')),
  recommendations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**

```sql
CREATE INDEX idx_sensor_readings_room_id ON sensor_readings(room_id);
CREATE INDEX idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
CREATE INDEX idx_sensor_readings_created_at ON sensor_readings(created_at DESC);
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| room_id | UUID | FOREIGN KEY → rooms, NOT NULL | Associated room |
| sensor_id | TEXT | NOT NULL | Sensor device ID |
| temperature | DECIMAL(5,2) | NOT NULL | Temperature in °C |
| humidity | DECIMAL(5,2) | NOT NULL | Humidity in % |
| co2 | INTEGER | NOT NULL | CO2 in ppm |
| quality_score | INTEGER | NULL | Calculated score 0-100 |
| quality_level | TEXT | CHECK constraint | 'good', 'moderate', or 'poor' |
| recommendations | TEXT[] | NULL | Array of suggestions |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Reading timestamp |

**RLS Policies:**

```sql
-- Everyone can view sensor readings
CREATE POLICY "Sensor readings are viewable by everyone" ON sensor_readings
  FOR SELECT USING (true);

-- Allow inserts from authenticated users and service role (for Node-RED)
CREATE POLICY "Authenticated users can insert sensor readings" ON sensor_readings
  FOR INSERT WITH CHECK (true);
```

---

## Relationships

```
auth.users (Supabase Auth)
    ↓ (1:N)
buildings
    ↓ (1:N)
rooms
    ↓ (1:N)
sensor_readings
```

- One user can have many buildings
- One building can have many rooms
- One room can have many sensor readings
- Deleting a building cascades to delete all its rooms and their readings
- Deleting a room cascades to delete all its readings
- Deleting a user cascades to delete all their buildings, rooms, and readings

---

## Queries

### Get all buildings with room counts

```sql
SELECT
  b.*,
  COUNT(r.id) as room_count
FROM buildings b
LEFT JOIN rooms r ON r.building_id = b.id
GROUP BY b.id
ORDER BY b.created_at DESC;
```

### Get a building with all its rooms and latest readings

```sql
SELECT
  b.id as building_id,
  b.name as building_name,
  b.code as building_code,
  b.address,
  r.*,
  (
    SELECT json_build_object(
      'id', sr.id,
      'temperature', sr.temperature,
      'humidity', sr.humidity,
      'co2', sr.co2,
      'quality_score', sr.quality_score,
      'quality_level', sr.quality_level,
      'recommendations', sr.recommendations,
      'created_at', sr.created_at
    )
    FROM sensor_readings sr
    WHERE sr.room_id = r.id
    ORDER BY sr.created_at DESC
    LIMIT 1
  ) as latest_reading
FROM buildings b
LEFT JOIN rooms r ON r.building_id = b.id
WHERE b.id = 'building-uuid'
ORDER BY r.created_at DESC;
```

### Get all rooms with latest reading

```sql
SELECT
  r.*,
  (
    SELECT json_build_object(
      'id', sr.id,
      'temperature', sr.temperature,
      'humidity', sr.humidity,
      'co2', sr.co2,
      'quality_score', sr.quality_score,
      'quality_level', sr.quality_level,
      'recommendations', sr.recommendations,
      'created_at', sr.created_at
    )
    FROM sensor_readings sr
    WHERE sr.room_id = r.id
    ORDER BY sr.created_at DESC
    LIMIT 1
  ) as latest_reading
FROM rooms r
ORDER BY r.created_at DESC;
```

### Get readings for a specific room

```sql
SELECT *
FROM sensor_readings
WHERE room_id = 'room-uuid'
ORDER BY created_at DESC
LIMIT 100;
```

### Get average air quality by room (last 24 hours)

```sql
SELECT
  r.name,
  r.room_code,
  AVG(sr.quality_score) as avg_score,
  AVG(sr.temperature) as avg_temp,
  AVG(sr.humidity) as avg_humidity,
  AVG(sr.co2) as avg_co2
FROM rooms r
JOIN sensor_readings sr ON sr.room_id = r.id
WHERE sr.created_at > NOW() - INTERVAL '24 hours'
GROUP BY r.id, r.name, r.room_code
ORDER BY avg_score DESC;
```

### Get rooms with poor air quality

```sql
SELECT DISTINCT r.*
FROM rooms r
JOIN sensor_readings sr ON sr.room_id = r.id
WHERE sr.quality_level = 'poor'
  AND sr.created_at > NOW() - INTERVAL '1 hour'
ORDER BY r.name;
```

---

## Migrations

Migrations were applied using Supabase SQL Editor or MCP:

1. **create_buildings_table** - Creates buildings table with RLS policies
2. **create_rooms_table** - Creates rooms table with RLS policies
3. **add_building_id_to_rooms** - Adds building_id foreign key to rooms table
4. **create_sensor_readings_table** - Creates sensor_readings table with RLS policies

See [MIGRATIONS.md](./MIGRATIONS.md) for detailed migration scripts.

---

## Data Retention

Consider implementing data retention policies:

```sql
-- Delete readings older than 90 days (example)
DELETE FROM sensor_readings
WHERE created_at < NOW() - INTERVAL '90 days';
```

Set up a cron job or Supabase function to run this periodically.

---

## Backup Strategy

1. **Supabase Automatic Backups**: Daily backups (check your Supabase plan)
2. **Manual Backup**:
   ```bash
   pg_dump -h db.yourproject.supabase.co -U postgres -d postgres > backup.sql
   ```

---

## Performance Optimization

### Indexes

All necessary indexes are in place:

- Foreign keys indexed
- Frequently queried columns indexed
- Timestamp columns indexed for range queries

### Query Optimization Tips

1. Always use indexes when filtering:

   ```sql
   WHERE room_id = 'uuid'  -- Uses index
   WHERE sensor_id = 'id'  -- Uses index
   ```

2. Limit results for large datasets:

   ```sql
   SELECT * FROM sensor_readings
   ORDER BY created_at DESC
   LIMIT 1000;
   ```

3. Use aggregate functions efficiently:
   ```sql
   SELECT room_id, AVG(temperature)
   FROM sensor_readings
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY room_id;
   ```

---

## Security

### Row Level Security (RLS)

All tables have RLS enabled. Policies ensure:

- Public can view rooms and readings (for public dashboard)
- Only authenticated users can create rooms
- Users can only modify their own rooms
- Service role can insert readings (for Node-RED)

### Best Practices

1. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
2. Use anon key for client-side operations
3. Validate all inputs server-side
4. Use prepared statements (handled by Supabase client)

---

## Future Enhancements

Consider adding:

1. **User profiles table**

   ```sql
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users PRIMARY KEY,
     display_name TEXT,
     avatar_url TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Room sharing/permissions**

   ```sql
   CREATE TABLE room_permissions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     room_id UUID REFERENCES rooms,
     user_id UUID REFERENCES auth.users,
     permission TEXT CHECK (permission IN ('view', 'edit', 'admin')),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Alerts/notifications table**

   ```sql
   CREATE TABLE alerts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     room_id UUID REFERENCES rooms,
     condition TEXT,
     threshold DECIMAL,
     active BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **Historical aggregates for faster queries**
   ```sql
   CREATE TABLE hourly_aggregates (
     room_id UUID REFERENCES rooms,
     hour TIMESTAMPTZ,
     avg_temperature DECIMAL,
     avg_humidity DECIMAL,
     avg_co2 DECIMAL,
     avg_quality_score DECIMAL,
     PRIMARY KEY (room_id, hour)
   );
   ```
