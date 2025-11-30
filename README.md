# 🌿 AirSense Platform

A modern air quality monitoring platform built with Next.js and Supabase. Monitor real-time air quality data (temperature, humidity, CO2) across multiple rooms with sensor integration via Node-RED.

![Tech Stack](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Latest-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwind-css)

## ✨ Features

- 📊 **Public Dashboard** - View air quality data across all rooms
- 🔐 **User Authentication** - Secure signup/login with Supabase Auth
- 🏠 **Room Management** - Create and manage monitoring rooms
- 🌡️ **Real-time Monitoring** - Track temperature, humidity, and CO2 levels via WebSocket
- 📈 **Air Quality Scoring** - Automatic calculation with color-coded alerts
- 💡 **Smart Recommendations** - Actionable suggestions to improve air quality
- 🔌 **Node-RED Integration** - Easy sensor data ingestion via HTTP API + WebSocket
- 🔴 **Live Sensor Feed** - Real-time WebSocket streaming from Airsense devices
- 🎨 **Modern UI** - Beautiful, responsive design with Tailwind CSS

## 🏗️ Architecture

```
┌─────────────────┐
│ Airsense Device │
│  (micro:bit)    │
└────────┬────────┘
         │
         ▼
┌────────────────┐      HTTP POST       ┌──────────────┐
│   Node-RED     │ ──────────────────► │  Next.js API │
└────────┬───────┘                      └──────┬───────┘
         │                                     │
         │ WebSocket                           ▼
         │ (Real-time)               ┌───────────────┐
         │                           │  Air Quality  │
         │                           │  Calculation  │
         │                           └───────┬───────┘
         │                                   │
         │                                   ▼
         │                           ┌───────────────┐
         │                           │   Supabase    │
         │                           │   Database    │
         │                           └───────┬───────┘
         │                                   │
         └───────────────────────────────────┼────────►
                                             │
                                             ▼
                                     ┌───────────────┐
                                     │  Dashboard UI │
                                     │  (Live Feed)  │
                                     └───────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/airsense-platform.git
cd airsense-platform
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. **Run database migrations**

The database schema is already set up via Supabase MCP. If you need to run migrations manually, check the `docs/DATABASE_SCHEMA.md` file.

5. **Start the development server**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 📖 Documentation

- **[Node-RED Integration Guide](docs/NODE_RED_INTEGRATION.md)** - Complete guide for integrating sensors
- **[WebSocket Integration](docs/WEBSOCKET_INTEGRATION.md)** - Real-time sensor data streaming with WebSocket
- **[API Reference](docs/API_REFERENCE.md)** - API endpoints documentation
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - Database structure and relationships

## 🎯 Usage

### For End Users

1. **View Public Dashboard** - Visit the homepage to see all rooms' air quality
2. **Sign Up** - Create an account to manage your own rooms
3. **Create Rooms** - Add rooms and assign sensor IDs
4. **Monitor** - Watch real-time air quality data on the dashboard
5. **Live Feed** - See real-time WebSocket data from Airsense devices

### For Administrators

1. **Configure Node-RED** - Set up sensor data flows (see [Node-RED Integration Guide](docs/NODE_RED_INTEGRATION.md))
2. **Set up WebSocket** - Configure real-time data streaming (see [WebSocket Integration](docs/WEBSOCKET_INTEGRATION.md))
3. **Assign Sensors** - Link sensor IDs to rooms in the dashboard
4. **Monitor Data** - Ensure sensors are sending data correctly

## 🔌 API Endpoints

### POST `/api/sensor-data`

Send sensor readings from Node-RED

**Request:**

```json
{
  "sensor_id": "sensor_001",
  "temperature": 22.5,
  "humidity": 45,
  "co2": 650
}
```

**Response:**

```json
{
  "success": true,
  "reading": { ... },
  "air_quality": {
    "score": 85,
    "level": "good",
    "recommendations": ["Air quality is excellent!"]
  }
}
```

### GET `/api/rooms`

Get all rooms with latest sensor readings

### POST `/api/rooms`

Create a new room (authenticated)

### PATCH `/api/rooms/[id]`

Update a room (authenticated)

### DELETE `/api/rooms/[id]`

Delete a room (authenticated)

## 🎨 Air Quality Scoring

The platform calculates an air quality score (0-100) based on:

- **CO2 (40% weight)**

  - Good: < 800 ppm
  - Moderate: 800-1200 ppm
  - Poor: > 1200 ppm

- **Temperature (30% weight)**

  - Optimal: 20-24°C
  - Acceptable: 18-26°C
  - Poor: < 18°C or > 26°C

- **Humidity (30% weight)**
  - Optimal: 40-60%
  - Acceptable: 30-70%
  - Poor: < 30% or > 70%

### Quality Levels

| Score  | Level    | Color   | Emoji |
| ------ | -------- | ------- | ----- |
| 70-100 | Good     | #BCF4A8 | 😊    |
| 40-69  | Moderate | #FFAF76 | 😐    |
| 0-39   | Poor     | #F25E5E | 😟    |

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime (optional)
- **IoT Integration**: Node-RED

## 📁 Project Structure

```
airsense-platform/
├── app/
│   ├── api/
│   │   ├── rooms/          # Room management API
│   │   └── sensor-data/    # Sensor data ingestion API
│   ├── dashboard/          # Authenticated dashboard
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Public homepage
├── lib/
│   ├── supabase/           # Supabase client utilities
│   ├── hooks/              # React hooks (WebSocket, etc.)
│   ├── air-quality.ts      # Air quality calculation logic
│   ├── sensor-utils.ts     # Sensor data processing utilities
│   └── types.ts            # TypeScript type definitions
├── docs/                   # Documentation
└── middleware.ts           # Auth middleware
```

## 🔒 Security

- Row Level Security (RLS) policies on all database tables
- Authenticated routes protected via middleware
- API endpoints with proper authorization
- Secure authentication with Supabase Auth

## 🚀 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your hosting platform:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Built with ❤️ for better indoor air quality monitoring

## 🐛 Troubleshooting

### Common Issues

**Sensors not showing data:**

- Check sensor_id matches the room configuration
- Verify Node-RED is sending data to the correct endpoint
- Check API logs for errors
- For WebSocket: Ensure Node-RED WebSocket server is running at `ws://localhost:1880/ws/sensors`
- Check browser console for WebSocket connection errors

**Authentication issues:**

- Clear browser cookies and try again
- Verify Supabase environment variables
- Check Supabase Auth settings

**Database connection errors:**

- Verify Supabase URL and keys
- Check database is not paused
- Verify RLS policies are correct

## 📞 Support

For issues and questions:

- Open an issue on GitHub
- Check the [Node-RED Integration Guide](docs/NODE_RED_INTEGRATION.md)
- Review Supabase logs for errors

---

**Happy Monitoring! 🌿**
