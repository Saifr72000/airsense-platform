"use client";

import { useEffect, useState } from "react";
import { RoomWithLatestReading } from "@/lib/types";
import { getQualityEmoji } from "@/lib/air-quality";
import Link from "next/link";
import { Logo } from "./components/Logo";
import { QualityIcon } from "./components/QualityIcon";

export default function HomePage() {
  const [rooms, setRooms] = useState<RoomWithLatestReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRooms, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (level: string | null) => {
    switch (level) {
      case "good":
        return "#BCF4A8";
      case "moderate":
        return "#FFAF76";
      case "poor":
        return "#F25E5E";
      default:
        return "#E5E7EB";
    }
  };

  const getQualityBadge = (level: string | null) => {
    switch (level) {
      case "good":
        return { text: "Good", emoji: "😊" };
      case "moderate":
        return { text: "Moderate", emoji: "😐" };
      case "poor":
        return { text: "Poor", emoji: "😟" };
      default:
        return { text: "No Data", emoji: "❓" };
    }
  };

  const qualityCounts = rooms.reduce((acc, room) => {
    const level = room.latest_reading?.quality_level || "no-data";
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `Updated ${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `Updated ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Updated ${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F8F8F8" }}
      >
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F8F8" }}>
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Logo />
          </div>
          <Link
            href="/login"
            className="px-6 py-2 rounded-lg font-semibold transition-all text-black"
            style={{ backgroundColor: "#BCF4A8" }}
          >
            Sign In
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Title Section */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 text-black">
            Indoor Air Quality
          </h1>
          <p className="text-gray-600 text-lg">
            Monitor real-time air quality data across campus. Find the best
            spaces to study, work, and collaborate based on CO2 levels,
            temperature, and humidity
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-sm text-gray-700 mb-2">Total Rooms</div>
            <div className="text-4xl font-bold text-black">{rooms.length}</div>
          </div>
          <div
            className="rounded-2xl p-6 shadow-sm"
            style={{ backgroundColor: "#BCF4A8" }}
          >
            <div className="text-sm mb-2 flex items-center text-black">
              Good Quality{" "}
              <span className="ml-2">
                <QualityIcon level="good" />
              </span>
            </div>
            <div className="text-4xl font-bold text-black">
              {qualityCounts.good || 0}
            </div>
          </div>
          <div
            className="rounded-2xl p-6 shadow-sm"
            style={{ backgroundColor: "#FFAF76" }}
          >
            <div className="text-sm mb-2 flex items-center text-black">
              Moderate{" "}
              <span className="ml-2">
                <QualityIcon level="moderate" />
              </span>
            </div>
            <div className="text-4xl font-bold text-black">
              {qualityCounts.moderate || 0}
            </div>
          </div>
          <div
            className="rounded-2xl p-6 shadow-sm"
            style={{ backgroundColor: "#F25E5E" }}
          >
            <div className="text-sm mb-2 flex items-center text-white">
              Poor{" "}
              <span className="ml-2">
                <QualityIcon level="poor" />
              </span>
            </div>
            <div className="text-4xl font-bold text-white">
              {qualityCounts.poor || 0}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Room Cards */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6 text-black">Smaragd</h2>

            {rooms.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <p className="text-gray-700">No rooms available yet</p>
                <Link
                  href="/dashboard"
                  className="mt-4 inline-block px-6 py-2 rounded-lg font-semibold text-black"
                  style={{ backgroundColor: "#BCF4A8" }}
                >
                  Add your first room
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => {
                  const badge = getQualityBadge(
                    room.latest_reading?.quality_level || null
                  );
                  return (
                    <div
                      key={room.id}
                      className="bg-white rounded-2xl p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-black">
                            {room.name}
                          </h3>
                          <p className="text-sm text-gray-700">
                            {room.room_code}
                          </p>
                        </div>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: getQualityColor(
                              room.latest_reading?.quality_level || null
                            ),
                            color:
                              room.latest_reading?.quality_level === "poor"
                                ? "white"
                                : "black",
                          }}
                        >
                          {badge.text}
                        </span>
                      </div>

                      {room.latest_reading ? (
                        <>
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <div className="flex items-center text-xs text-gray-600 mb-1">
                                <span className="mr-1">💨</span> CO2
                              </div>
                              <div className="text-xl font-bold">
                                {room.latest_reading.co2}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center text-xs text-gray-600 mb-1">
                                <span className="mr-1">🌡️</span> Temp
                              </div>
                              <div className="text-xl font-bold">
                                {room.latest_reading.temperature}°
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center text-xs text-gray-600 mb-1">
                                <span className="mr-1">💧</span> Humidity
                              </div>
                              <div className="text-xl font-bold">
                                {room.latest_reading.humidity}%
                              </div>
                            </div>
                          </div>

                          <div className="text-xs text-gray-600 pt-3 border-t">
                            {formatTimeAgo(room.latest_reading.created_at)}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-700">
                          No sensor data available
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Air Quality Levels Legend */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-black">
                Air Quality Levels
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-xl mr-3">
                    <QualityIcon level="good" variant="filled" />
                  </span>
                  <div>
                    <div className="font-semibold text-black">Good</div>
                    <div className="text-sm text-gray-700">
                      CO2 &lt; 800 ppm
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-xl mr-3">
                    <QualityIcon level="moderate" variant="filled" />
                  </span>
                  <div>
                    <div className="font-semibold text-black">Moderate</div>
                    <div className="text-sm text-gray-700">
                      CO2: 800-1200 ppm
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-xl mr-3">
                    <QualityIcon level="poor" variant="filled" />
                  </span>
                  <div>
                    <div className="font-semibold text-black">Poor</div>
                    <div className="text-sm text-gray-700">
                      CO2 &gt; 1200 ppm
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-black">Tip</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  • Choose rooms with good air quality for long study sessions
                </li>
                <li>• Take breaks in well-ventilated areas</li>
                <li>• Open windows when CO₂ levels are elevated</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
