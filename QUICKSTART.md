# 🚀 Quick Start Guide

Get your AirSense platform up and running in 5 minutes!

## Prerequisites

- Node.js 20.18.0 (you're already using this!)
- npm or yarn
- Supabase account (already configured!)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Environment Variables

Your `.env.local` file is already configured with:

- ✅ Supabase URL
- ✅ Supabase Anon Key

**Important:** For Node-RED integration to work properly, you need to add the service role key:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find this in your Supabase Dashboard → Settings → API → service_role key (secret)

## Step 3: Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) 🎉

## Step 4: Create Your First Room

1. Click "Sign In" → "Sign up" to create an account
2. After login, you'll be on the dashboard
3. Click "+ Add Room"
4. Fill in:
   - Room Name: e.g., "Group Room 1"
   - Room Code: e.g., "S307"
   - Sensor ID: e.g., "sensor_001"
5. Click "Create"

## Step 5: Test with Node-RED (Optional)

### Option A: Import Example Flow

1. Open Node-RED
2. Menu → Import → Clipboard
3. Paste contents from `docs/node-red-flow-example.json`
4. Click the inject nodes to send test data

### Option B: Quick Test with cURL

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

You should see a response with air quality calculations!

## Step 6: View Your Data

1. Go to the homepage: [http://localhost:3000](http://localhost:3000)
2. You should see your room with the latest sensor reading
3. Check the air quality score and recommendations

## What's Next?

### Connect Real Sensors

1. Read the [Node-RED Integration Guide](docs/NODE_RED_INTEGRATION.md)
2. Configure your sensors to send data to the API
3. Watch real-time updates on the dashboard

### Customize Air Quality Thresholds

Edit `lib/air-quality.ts` to adjust:

- CO2 thresholds
- Temperature ranges
- Humidity ranges
- Scoring weights

### Deploy to Production

1. Push to GitHub
2. Deploy to Vercel (or your preferred platform)
3. Add environment variables in the platform dashboard
4. Update Node-RED endpoint URL to production

## Troubleshooting

### "No rooms available yet"

- Make sure you're logged in
- Create a room from the dashboard

### Sensor data not showing

- Check that `sensor_id` in your request matches a room's sensor ID
- Verify the API endpoint is correct
- Check browser console for errors

### Authentication issues

- Clear browser cookies
- Check Supabase credentials in `.env.local`
- Verify Supabase project is active

## File Structure Overview

```
airsense-platform/
├── app/
│   ├── page.tsx           # Public homepage (air quality dashboard)
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── dashboard/         # User dashboard (manage rooms)
│   └── api/
│       ├── sensor-data/   # POST endpoint for sensors
│       └── rooms/         # CRUD endpoints for rooms
├── lib/
│   ├── supabase/          # Supabase client setup
│   ├── air-quality.ts     # Air quality calculation logic
│   └── types.ts           # TypeScript types
├── docs/
│   ├── NODE_RED_INTEGRATION.md
│   ├── API_REFERENCE.md
│   └── DATABASE_SCHEMA.md
└── .env.local             # Environment variables
```

## Key Features to Try

✅ **Public Dashboard** - View all rooms without login  
✅ **User Authentication** - Sign up and manage your rooms  
✅ **Room Management** - Create, edit, delete rooms  
✅ **Sensor Integration** - Connect via Node-RED or HTTP  
✅ **Real-time Updates** - See live air quality data  
✅ **Smart Recommendations** - Get actionable suggestions

## Database Check

Your Supabase database has:

- ✅ `rooms` table with RLS policies
- ✅ `sensor_readings` table with indexes
- ✅ Proper foreign key relationships

## API Endpoints

| Endpoint           | Method | Description            |
| ------------------ | ------ | ---------------------- |
| `/api/sensor-data` | POST   | Submit sensor readings |
| `/api/rooms`       | GET    | List all rooms         |
| `/api/rooms`       | POST   | Create room (auth)     |
| `/api/rooms/[id]`  | GET    | Get room details       |
| `/api/rooms/[id]`  | PATCH  | Update room (auth)     |
| `/api/rooms/[id]`  | DELETE | Delete room (auth)     |

## Support

- 📖 [Full README](README.md)
- 🔌 [Node-RED Guide](docs/NODE_RED_INTEGRATION.md)
- 🔗 [API Reference](docs/API_REFERENCE.md)
- 💾 [Database Schema](docs/DATABASE_SCHEMA.md)

---

**Happy Monitoring! 🌿**

Need help? Check the documentation or create an issue on GitHub.
