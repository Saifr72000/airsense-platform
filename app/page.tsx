"use client";

import { useEffect, useState } from "react";
import { BuildingWithRooms, RoomWithLatestReading } from "@/lib/types";
import { getQualityEmoji, calculateAirQuality } from "@/lib/air-quality";
import Link from "next/link";
import { Logo } from "./components/Logo";
import { QualityIcon } from "./components/QualityIcon";
import { createClient } from "@/lib/supabase/client";
import { useNodeRedSensor } from "@/lib/hooks/useNodeRedSensor";

export default function HomePage() {
  const [buildings, setBuildings] = useState<BuildingWithRooms[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [selectedQuality, setSelectedQuality] = useState<string>("all");
  const [selectedRoom, setSelectedRoom] =
    useState<RoomWithLatestReading | null>(null);
  const [showModal, setShowModal] = useState(false);
  const supabase = createClient();

  // WebSocket connection for real-time sensor data
  const { data: liveSensorData, isConnected: isSensorConnected } =
    useNodeRedSensor({
      wsUrl: "ws://localhost:1880/ws/sensors",
      autoConnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
    });

  // Debug: Log WebSocket status
  useEffect(() => {
    console.log(
      "[Public Page] WebSocket Status - Connected:",
      isSensorConnected,
      "| Data:",
      liveSensorData
    );
  }, [isSensorConnected, liveSensorData]);

  useEffect(() => {
    checkAuth();
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
  };

  const openRoomModal = (room: RoomWithLatestReading) => {
    setSelectedRoom(room);
    setShowModal(true);
  };

  const closeRoomModal = () => {
    setShowModal(false);
    setSelectedRoom(null);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Updated just now";
    if (diffMins < 60)
      return `Updated ${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `Updated ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `Updated ${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const fetchData = async () => {
    try {
      // Fetch all buildings
      const buildingsResponse = await fetch("/api/buildings");
      const buildingsData = await buildingsResponse.json();

      // Fetch all rooms
      const roomsResponse = await fetch("/api/rooms");
      const roomsData = await roomsResponse.json();

      // Group rooms by building
      const buildingsWithRooms = buildingsData.map(
        (building: BuildingWithRooms) => ({
          ...building,
          rooms: roomsData.filter(
            (room: RoomWithLatestReading) => room.building_id === building.id
          ),
        })
      );

      setBuildings(buildingsWithRooms);
    } catch (error) {
      console.error("Error fetching data:", error);
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

  // Helper function to get live data for a room (if available)
  const getRoomData = (room: RoomWithLatestReading) => {
    // Check if this room has a sensor_id that matches the live feed
    // Support both old and new sensor IDs for Group Room 1 S307
    const hasLiveSensor =
      (room.sensor_id === "airsense_device_001" ||
        (room.room_code === "S307" && room.sensor_id === "sensor_smr_307")) &&
      liveSensorData &&
      liveSensorData.isValid &&
      isSensorConnected;

    if (hasLiveSensor && liveSensorData) {
      // Calculate air quality from live data
      const airQuality = calculateAirQuality(
        liveSensorData.temperature,
        liveSensorData.humidity !== -999 ? liveSensorData.humidity : 50,
        liveSensorData.co2
      );

      return {
        data: {
          co2: liveSensorData.co2,
          temperature: liveSensorData.temperature,
          humidity:
            liveSensorData.humidity !== -999 ? liveSensorData.humidity : null,
          quality_level: airQuality.level,
          quality_score: airQuality.score,
        },
        isLive: true,
      };
    }

    // Fall back to database data
    return {
      data: room.latest_reading
        ? {
            co2: room.latest_reading.co2,
            temperature: room.latest_reading.temperature,
            humidity: room.latest_reading.humidity,
            quality_level: room.latest_reading.quality_level,
            quality_score: room.latest_reading.quality_score,
          }
        : null,
      isLive: false,
    };
  };

  // Get all rooms from all buildings for summary counts
  const allRooms = buildings.flatMap((building) => building.rooms);

  // Calculate quality counts using live data when available
  const qualityCounts = allRooms.reduce((acc, room) => {
    const roomData = getRoomData(room);
    const level = roomData.data?.quality_level || "no-data";
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter buildings and rooms based on selected filters
  const filteredBuildings = buildings
    .map((building) => {
      // Filter rooms by quality level (using live data when available)
      const filteredRooms = building.rooms.filter((room) => {
        if (selectedQuality === "all") return true;
        const roomData = getRoomData(room);
        return roomData.data?.quality_level === selectedQuality;
      });

      return {
        ...building,
        rooms: filteredRooms,
      };
    })
    .filter((building) => {
      // Filter by selected building
      if (selectedBuilding === "all") return building.rooms.length > 0;
      return building.id === selectedBuilding && building.rooms.length > 0;
    });

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
      <header
        style={{
          backgroundColor: "#FBFBFB",
          boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Logo />
          </div>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="px-6 py-2 rounded-lg font-semibold transition-all text-white cursor-pointer hover:opacity-90"
              style={{ backgroundColor: "#1885c4" }}
            >
              My Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-6 py-2 rounded-lg font-semibold transition-all text-white cursor-pointer hover:opacity-90"
              style={{ backgroundColor: "#1885C4" }}
            >
              Sign In
            </Link>
          )}
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
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: "#FBFBFB",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "rgba(0, 0, 0, 0.12)",
              boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
            }}
          >
            <div className="text-sm text-gray-700 mb-2">Total Rooms</div>
            <div className="text-4xl font-bold text-black">
              {allRooms.length}
            </div>
          </div>
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: "#BCF4A8",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "rgba(0, 0, 0, 0.12)",
              boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
            }}
          >
            <div className="text-sm mb-2 flex items-center text-black">
              Good Quality{" "}
              <span className="ml-2">
                <QualityIcon level="good" variant="filled" />
              </span>
            </div>
            <div className="text-4xl font-bold text-black">
              {qualityCounts.good || 0}
            </div>
          </div>
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: "#FFAF76",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "rgba(0, 0, 0, 0.12)",
              boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
            }}
          >
            <div className="text-sm mb-2 flex items-center text-black">
              Moderate Quality{" "}
              <span className="ml-2">
                <QualityIcon level="moderate" variant="filled" />
              </span>
            </div>
            <div className="text-4xl font-bold text-black">
              {qualityCounts.moderate || 0}
            </div>
          </div>
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: "#F25E5E",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "rgba(0, 0, 0, 0.12)",
              boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
            }}
          >
            <div className="text-sm mb-2 flex items-center text-black">
              Poor Quality{" "}
              <span className="ml-2">
                <QualityIcon level="poor" variant="filled" />
              </span>
            </div>
            <div className="text-4xl font-bold text-black">
              {qualityCounts.poor || 0}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{
            backgroundColor: "#FBFBFB",
            boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
          }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-gray-700 font-medium">Filter by:</span>

            {/* Building Filter */}
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="px-4 py-2 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-green-500 text-black cursor-pointer min-w-[200px]"
              style={{ backgroundColor: "#E8E8E8" }}
            >
              <option value="all">All buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>

            {/* Quality Level Filter */}
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="px-4 py-2 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-green-500 text-black cursor-pointer min-w-[200px]"
              style={{ backgroundColor: "#E8E8E8" }}
            >
              <option value="all">All quality levels</option>
              <option value="good">Good</option>
              <option value="moderate">Moderate</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Room Cards by Building */}
          <div className="lg:col-span-3">
            {buildings.length === 0 ? (
              <div
                className="rounded-2xl p-12 text-center"
                style={{
                  backgroundColor: "#FBFBFB",
                  boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
                }}
              >
                <p className="text-gray-700">No buildings available yet</p>
                <Link
                  href="/dashboard"
                  className="mt-4 inline-block px-6 py-2 rounded-lg font-semibold text-black cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#BCF4A8" }}
                >
                  Add your first building
                </Link>
              </div>
            ) : filteredBuildings.length === 0 ? (
              <div
                className="rounded-2xl p-12 text-center"
                style={{
                  backgroundColor: "#FBFBFB",
                  boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
                }}
              >
                <p className="text-gray-700">
                  No rooms match the selected filters
                </p>
                <button
                  onClick={() => {
                    setSelectedBuilding("all");
                    setSelectedQuality("all");
                  }}
                  className="mt-4 px-6 py-2 rounded-lg font-semibold text-black cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#BCF4A8" }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBuildings.flatMap((building) =>
                  building.rooms.map((room) => {
                    const roomData = getRoomData(room);
                    const badge = getQualityBadge(
                      roomData.data?.quality_level || null
                    );
                    return (
                      <div
                        key={room.id}
                        className="rounded-2xl p-6 cursor-pointer transition-shadow"
                        style={{
                          backgroundColor: "#FBFBFB",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          borderColor: "rgba(0, 0, 0, 0.12)",
                          boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
                        }}
                        onClick={() => openRoomModal(room)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow =
                            "0px 4px 15px 0px rgba(19, 19, 19, 0.35)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow =
                            "0px 2px 10px 0px rgba(19, 19, 19, 0.25)";
                        }}
                      >
                        {/* Building Name - Always visible */}
                        <div className="mb-4 pb-3 border-b border-gray-100">
                          <h3 className="font-bold text-base text-black">
                            {building.name}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            {building.code}
                          </p>
                        </div>

                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-black">
                              {room.name}
                            </h3>
                            <p className="text-sm text-gray-700 flex items-center gap-2">
                              {room.room_code}
                              {roomData.isLive && (
                                <span className="inline-flex items-center text-xs text-green-600 font-semibold">
                                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                                  Live
                                </span>
                              )}
                            </p>
                          </div>
                          <span
                            className="px-3 py-1 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: getQualityColor(
                                roomData.data?.quality_level || null
                              ),
                              color:
                                roomData.data?.quality_level === "poor"
                                  ? "black"
                                  : "black",
                            }}
                          >
                            {badge.text}
                          </span>
                        </div>

                        {roomData.data ? (
                          <>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div>
                                <div className="flex items-center text-xs text-gray-600 mb-1">
                                  <span className="mr-1">💨</span> CO2
                                </div>
                                <div className="text-xl font-bold">
                                  {roomData.data.co2}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center text-xs text-gray-600 mb-1">
                                  <span className="mr-1">🌡️</span> Temp
                                </div>
                                <div className="text-xl font-bold">
                                  {roomData.data.temperature}°
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center text-xs text-gray-600 mb-1">
                                  <span className="mr-1">💧</span> Humidity
                                </div>
                                <div className="text-xl font-bold">
                                  {roomData.data.humidity !== null
                                    ? `${roomData.data.humidity}%`
                                    : "N/A"}
                                </div>
                              </div>
                            </div>

                            <div className="text-xs text-gray-600 pt-3 border-t">
                              {roomData.isLive
                                ? "Updated just now"
                                : room.latest_reading
                                ? formatTimeAgo(room.latest_reading.created_at)
                                : "No data"}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-700">
                            No sensor data available
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Air Quality Levels Legend */}
            <div
              className="bg-blue-50 rounded-2xl p-6"
              style={{
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "rgba(0, 0, 0, 0.12)",
                boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
              }}
            >
              <h3 className="font-bold text-lg mb-4 text-black">CO2 Levels</h3>
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
            <div
              className="bg-blue-50 rounded-2xl p-6"
              style={{
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "rgba(0, 0, 0, 0.12)",
                boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
              }}
            >
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

      {/* Room Detail Modal */}
      {showModal &&
        selectedRoom &&
        (() => {
          const modalRoomData = getRoomData(selectedRoom);
          return (
            <div
              className="fixed inset-0 bg-gray-900 bg-opacity-40 flex items-center justify-center z-50 p-4"
              onClick={closeRoomModal}
            >
              <div
                className="rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                style={{
                  backgroundColor: "#FBFBFB",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "rgba(0, 0, 0, 0.12)",
                  boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-black">
                      {selectedRoom.name}
                    </h2>
                    <p className="text-gray-600 mt-1 flex items-center gap-2">
                      {selectedRoom.room_code}
                      {modalRoomData.isLive && (
                        <span className="inline-flex items-center text-xs text-green-600 font-semibold">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                          Live
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="px-4 py-2 rounded-full text-sm font-semibold"
                      style={{
                        backgroundColor: getQualityColor(
                          modalRoomData.data?.quality_level || null
                        ),
                        color:
                          modalRoomData.data?.quality_level === "poor"
                            ? "white"
                            : "black",
                      }}
                    >
                      {
                        getQualityBadge(
                          modalRoomData.data?.quality_level || null
                        ).text
                      }
                    </span>
                    <button
                      onClick={closeRoomModal}
                      className="text-gray-400 hover:text-gray-600 text-2xl font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {modalRoomData.data ? (
                  <>
                    {/* Air Quality Score */}
                    <div
                      className="rounded-2xl p-6 mb-6"
                      style={{
                        backgroundColor: getQualityColor(
                          modalRoomData.data.quality_level || null
                        ),
                      }}
                    >
                      <div
                        className="text-sm font-medium mb-2"
                        style={{
                          color:
                            modalRoomData.data.quality_level === "poor"
                              ? "rgba(255, 255, 255, 0.9)"
                              : "rgba(0, 0, 0, 0.7)",
                        }}
                      >
                        Air Quality Score
                      </div>
                      <div className="flex items-end gap-2 mb-3">
                        <span
                          className="text-5xl font-bold"
                          style={{
                            color:
                              modalRoomData.data.quality_level === "poor"
                                ? "white"
                                : "black",
                          }}
                        >
                          {modalRoomData.data.quality_score || 0}
                        </span>
                        <span
                          className="text-2xl mb-2"
                          style={{
                            color:
                              modalRoomData.data.quality_level === "poor"
                                ? "rgba(255, 255, 255, 0.8)"
                                : "rgba(0, 0, 0, 0.6)",
                          }}
                        >
                          /100
                        </span>
                      </div>
                      <div className="w-full bg-white bg-opacity-50 rounded-full h-3">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${modalRoomData.data.quality_score || 0}%`,
                            backgroundColor:
                              modalRoomData.data.quality_level === "good"
                                ? "#4CAF50"
                                : modalRoomData.data.quality_level ===
                                  "moderate"
                                ? "#FF9800"
                                : "#E53935",
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {/* CO2 */}
                      <div className="bg-gray-50 rounded-2xl p-5">
                        <div className="text-3xl mb-2">💨</div>
                        <div className="text-3xl font-bold text-black mb-1">
                          {modalRoomData.data.co2}
                        </div>
                        <div className="text-sm font-medium text-black mb-1">
                          Carbon Dioxide
                        </div>
                        <div className="text-xs text-gray-600">
                          Ideal: &lt; 800
                        </div>
                      </div>

                      {/* Temperature */}
                      <div className="bg-gray-50 rounded-2xl p-5">
                        <div className="text-3xl mb-2">🌡️</div>
                        <div className="text-3xl font-bold text-black mb-1">
                          {modalRoomData.data.temperature}°C
                        </div>
                        <div className="text-sm font-medium text-black mb-1">
                          Temperature
                        </div>
                        <div className="text-xs text-gray-600">
                          Ideal: 20-22°C
                        </div>
                      </div>

                      {/* Humidity */}
                      <div className="bg-gray-50 rounded-2xl p-5">
                        <div className="text-3xl mb-2">💧</div>
                        <div className="text-3xl font-bold text-black mb-1">
                          {modalRoomData.data.humidity !== null
                            ? `${modalRoomData.data.humidity}%`
                            : "N/A"}
                        </div>
                        <div className="text-sm font-medium text-black mb-1">
                          Humidity
                        </div>
                        <div className="text-xs text-gray-600">
                          Ideal: 40-60%
                        </div>
                      </div>
                    </div>

                    {/* AI Tip */}
                    {modalRoomData.isLive &&
                      (() => {
                        // Calculate air quality with recommendations
                        const airQuality = calculateAirQuality(
                          modalRoomData.data.temperature,
                          modalRoomData.data.humidity !== null
                            ? modalRoomData.data.humidity
                            : 50,
                          modalRoomData.data.co2
                        );

                        return (
                          <div className="bg-blue-50 rounded-2xl p-6 mb-6">
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">💡</span>
                              <div>
                                <h3 className="font-bold text-lg mb-2 text-black">
                                  AI Tip
                                </h3>
                                <ul className="space-y-2">
                                  {airQuality.recommendations.map(
                                    (rec, idx) => (
                                      <li
                                        key={idx}
                                        className="text-gray-700 flex items-start"
                                      >
                                        <span className="mr-2">•</span>
                                        <span>{rec}</span>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                    {/* Updated timestamp */}
                    <div className="text-center text-sm text-gray-800">
                      {modalRoomData.isLive
                        ? "Updated just now"
                        : selectedRoom.latest_reading
                        ? formatTimeAgo(selectedRoom.latest_reading.created_at)
                        : "No data"}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600 text-lg">
                      No sensor data available for this room
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
