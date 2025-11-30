"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Building, Room, RoomWithLatestReading } from "@/lib/types";
import { Logo } from "../components/Logo";
import { LiveSensorCard } from "../components/LiveSensorCard";
import { useNodeRedSensor } from "@/lib/hooks/useNodeRedSensor";

export default function DashboardPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<RoomWithLatestReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [roomFormData, setRoomFormData] = useState({
    name: "",
    room_code: "",
    building_id: "",
    sensor_id: "",
  });
  const [buildingFormData, setBuildingFormData] = useState({
    name: "",
    code: "",
    address: "",
  });
  const router = useRouter();
  const supabase = createClient();

  // WebSocket connection for real-time sensor data
  const {
    data: sensorData,
    isConnected: isSensorConnected,
    error: sensorError,
    reconnect: reconnectSensor,
  } = useNodeRedSensor({
    wsUrl: "ws://localhost:1880/ws/sensors",
    autoConnect: true,
    reconnectInterval: 2000,
    maxReconnectAttempts: 5,
  });

  useEffect(() => {
    checkUser();
    fetchBuildings();
    fetchUserRooms();
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  const fetchBuildings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch("/api/buildings");
      const allBuildings = await response.json();
      const userBuildings = allBuildings.filter(
        (building: Building) => building.user_id === user.id
      );
      setBuildings(userBuildings);
    } catch (error) {
      console.error("Error fetching buildings:", error);
    }
  };

  const fetchUserRooms = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch("/api/rooms");
      const allRooms = await response.json();
      const userRooms = allRooms.filter(
        (room: Room) => room.user_id === user.id
      );
      setRooms(userRooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const openCreateRoomModal = () => {
    setEditingRoom(null);
    setError("");
    setRoomFormData({
      name: "",
      room_code: "",
      building_id: buildings.length > 0 ? buildings[0].id : "",
      sensor_id: "",
    });
    setShowRoomModal(true);
  };

  const openEditRoomModal = (room: Room) => {
    setEditingRoom(room);
    setError("");
    setRoomFormData({
      name: room.name,
      room_code: room.room_code,
      building_id: room.building_id,
      sensor_id: room.sensor_id || "",
    });
    setShowRoomModal(true);
  };

  const openCreateBuildingModal = () => {
    setEditingBuilding(null);
    setError("");
    setBuildingFormData({ name: "", code: "", address: "" });
    setShowBuildingModal(true);
  };

  const openEditBuildingModal = (building: Building) => {
    setEditingBuilding(building);
    setBuildingFormData({
      name: building.name,
      code: building.code,
      address: building.address || "",
    });
    setShowBuildingModal(true);
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (editingRoom) {
        // Update existing room
        const response = await fetch(`/api/rooms/${editingRoom.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: roomFormData.name,
            sensor_id: roomFormData.sensor_id || null,
          }),
        });

        if (response.ok) {
          await fetchUserRooms();
          setShowRoomModal(false);
        } else {
          const data = await response.json();
          setError(data.error || "Failed to update room");
        }
      } else {
        // Create new room
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(roomFormData),
        });

        if (response.ok) {
          await fetchUserRooms();
          setShowRoomModal(false);
        } else {
          const data = await response.json();
          // Check for duplicate room_code error
          if (
            (data.error && data.error.includes("duplicate")) ||
            data.error.includes("unique")
          ) {
            setError(
              `Room code "${roomFormData.room_code}" already exists. Please use a different code.`
            );
          } else {
            setError(data.error || "Failed to create room");
          }
        }
      }
    } catch (error) {
      console.error("Error saving room:", error);
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuildingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (editingBuilding) {
        // Update existing building
        const response = await fetch(`/api/buildings/${editingBuilding.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: buildingFormData.name,
            address: buildingFormData.address || null,
          }),
        });

        if (response.ok) {
          await fetchBuildings();
          setShowBuildingModal(false);
        } else {
          const data = await response.json();
          setError(data.error || "Failed to update building");
        }
      } else {
        // Create new building
        const response = await fetch("/api/buildings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildingFormData),
        });

        if (response.ok) {
          await fetchBuildings();
          setShowBuildingModal(false);
        } else {
          const data = await response.json();
          // Check for duplicate code error
          if (
            data.error &&
            (data.error.includes("duplicate") || data.error.includes("unique"))
          ) {
            setError(
              `Building code "${buildingFormData.code}" already exists. Please use a different code.`
            );
          } else {
            setError(data.error || "Failed to create building");
          }
        }
      }
    } catch (error) {
      console.error("Error saving building:", error);
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;

    setDeleting(roomId);
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchUserRooms();
      }
    } catch (error) {
      console.error("Error deleting room:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteBuilding = async (buildingId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this building? This will also delete all rooms in this building."
      )
    )
      return;

    setDeleting(buildingId);
    try {
      const response = await fetch(`/api/buildings/${buildingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchBuildings();
        await fetchUserRooms();
      }
    } catch (error) {
      console.error("Error deleting building:", error);
    } finally {
      setDeleting(null);
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
        return "Good";
      case "moderate":
        return "Moderate";
      case "poor":
        return "Poor";
      default:
        return "No Data";
    }
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
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-600 hover:text-gray-900">
              Public Dashboard
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Title Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-black">
              My Buildings & Rooms
            </h1>
            <p className="text-gray-700">
              Manage your air quality monitoring locations
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openCreateBuildingModal}
              className="px-6 py-3 rounded-lg font-semibold text-black cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#FFAF76" }}
            >
              + Add Building
            </button>
            <button
              onClick={openCreateRoomModal}
              className="px-6 py-3 rounded-lg font-semibold text-black transition-opacity"
              style={{
                backgroundColor: "#BCF4A8",
                cursor: buildings.length === 0 ? "not-allowed" : "pointer",
                opacity: buildings.length === 0 ? 0.5 : 1,
              }}
              disabled={buildings.length === 0}
            >
              + Add Room
            </button>
          </div>
        </div>

        {/* Live Sensor Data Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-black">
            Live Sensor Feed
          </h2>
          <LiveSensorCard
            data={sensorData}
            isConnected={isSensorConnected}
            error={sensorError}
            roomName="Group Room 1"
            roomCode="S307"
            onReconnect={reconnectSensor}
          />
        </div>

        {/* Buildings & Rooms */}
        {buildings.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              backgroundColor: "#FBFBFB",
              boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
            }}
          >
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-bold mb-2 text-black">
              No buildings yet
            </h3>
            <p className="text-gray-700 mb-6">
              Create your first building to start adding rooms
            </p>
            <button
              onClick={openCreateBuildingModal}
              className="px-6 py-3 rounded-lg font-semibold text-black cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#FFAF76" }}
            >
              Create Building
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {buildings.map((building) => {
              const buildingRooms = rooms.filter(
                (room) => room.building_id === building.id
              );
              return (
                <div
                  key={building.id}
                  className="rounded-2xl p-6"
                  style={{
                    backgroundColor: "#FBFBFB",
                    boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
                  }}
                >
                  {/* Building Header */}
                  <div className="flex items-start justify-between mb-6 pb-4 border-b">
                    <div>
                      <h2 className="text-2xl font-bold text-black">
                        {building.name}
                      </h2>
                      <p className="text-sm text-gray-700 mt-1">
                        Code: {building.code}
                      </p>
                      {building.address && (
                        <p className="text-sm text-gray-600 mt-1">
                          📍 {building.address}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        {buildingRooms.length} room
                        {buildingRooms.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditBuildingModal(building)}
                        className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-black font-medium cursor-pointer transition-colors"
                        disabled={deleting === building.id}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBuilding(building.id)}
                        className="px-4 py-2 rounded-lg text-white font-medium cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: "#F25E5E" }}
                        disabled={deleting === building.id}
                      >
                        {deleting === building.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  {/* Rooms in Building */}
                  {buildingRooms.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">
                        No rooms in this building yet
                      </p>
                      <button
                        onClick={openCreateRoomModal}
                        className="px-4 py-2 rounded-lg font-semibold text-black cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: "#BCF4A8" }}
                      >
                        Add Room
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {buildingRooms.map((room) => (
                        <div
                          key={room.id}
                          className="bg-gray-50 rounded-xl p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-lg text-black">
                                {room.name}
                              </h3>
                              <p className="text-sm text-gray-700">
                                {room.room_code}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                Sensor: {room.sensor_id || "Not assigned"}
                              </p>
                            </div>
                            {room.latest_reading && (
                              <span
                                className="px-2 py-1 rounded-full text-xs font-semibold"
                                style={{
                                  backgroundColor: getQualityColor(
                                    room.latest_reading.quality_level
                                  ),
                                  color:
                                    room.latest_reading.quality_level === "poor"
                                      ? "white"
                                      : "black",
                                }}
                              >
                                {getQualityBadge(
                                  room.latest_reading.quality_level
                                )}
                              </span>
                            )}
                          </div>

                          {room.latest_reading ? (
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div>
                                <div className="flex items-center text-xs text-gray-600 mb-1">
                                  <span className="mr-1">💨</span> CO2
                                </div>
                                <div className="text-lg font-bold">
                                  {room.latest_reading.co2}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center text-xs text-gray-600 mb-1">
                                  <span className="mr-1">🌡️</span> Temp
                                </div>
                                <div className="text-lg font-bold">
                                  {room.latest_reading.temperature}°
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center text-xs text-gray-600 mb-1">
                                  <span className="mr-1">💧</span> Humidity
                                </div>
                                <div className="text-lg font-bold">
                                  {room.latest_reading.humidity}%
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-700 mb-3">
                              No sensor data yet
                            </div>
                          )}

                          <div className="flex gap-2 pt-3">
                            <button
                              onClick={() => openEditRoomModal(room)}
                              className="flex-1 px-3 py-2 rounded-lg bg-white hover:bg-gray-100 text-black font-medium text-sm cursor-pointer transition-colors"
                              disabled={deleting === room.id}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id)}
                              className="flex-1 px-3 py-2 rounded-lg text-white font-medium text-sm cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: "#F25E5E" }}
                              disabled={deleting === room.id}
                            >
                              {deleting === room.id ? "..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Room Modal */}
      {showRoomModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div
            className="rounded-2xl p-8 w-full max-w-md"
            style={{
              backgroundColor: "#FBFBFB",
              boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
            }}
          >
            <h2 className="text-2xl font-bold mb-6 text-black">
              {editingRoom ? "Edit Room" : "Create New Room"}
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleRoomSubmit} className="space-y-4">
              {!editingRoom && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-black">
                    Building
                  </label>
                  <select
                    value={roomFormData.building_id}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        building_id: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-3 rounded-lg border-0 focus:outline-none bg-gray-50 text-black shadow-sm"
                  >
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name} ({building.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-black">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomFormData.name}
                  onChange={(e) =>
                    setRoomFormData({ ...roomFormData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 rounded-lg border-0 focus:outline-none bg-gray-50 text-black shadow-sm"
                  placeholder="e.g., Group Room 1"
                />
              </div>

              {!editingRoom && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-black">
                    Room Code
                  </label>
                  <input
                    type="text"
                    value={roomFormData.room_code}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        room_code: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-3 rounded-lg border-0 focus:outline-none bg-gray-50 text-black shadow-sm"
                    placeholder="e.g., S307"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-black">
                  Sensor ID (Optional)
                </label>
                <input
                  type="text"
                  value={roomFormData.sensor_id}
                  onChange={(e) =>
                    setRoomFormData({
                      ...roomFormData,
                      sensor_id: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-lg border-0 focus:outline-none bg-gray-50 text-black shadow-sm"
                  placeholder="e.g., sensor_001"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="flex-1 px-6 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-black font-medium cursor-pointer transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-lg font-semibold text-black cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#BCF4A8" }}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : editingRoom ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Building Modal */}
      {showBuildingModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div
            className="rounded-2xl p-8 w-full max-w-md"
            style={{
              backgroundColor: "#FBFBFB",
              boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
            }}
          >
            <h2 className="text-2xl font-bold mb-6 text-black">
              {editingBuilding ? "Edit Building" : "Create New Building"}
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleBuildingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black">
                  Building Name
                </label>
                <input
                  type="text"
                  value={buildingFormData.name}
                  onChange={(e) =>
                    setBuildingFormData({
                      ...buildingFormData,
                      name: e.target.value,
                    })
                  }
                  required
                  className="w-full px-4 py-3 rounded-lg border-0 focus:outline-none bg-gray-50 text-black shadow-sm"
                  placeholder="e.g., Smaragd Building"
                />
              </div>

              {!editingBuilding && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-black">
                    Building Code
                  </label>
                  <input
                    type="text"
                    value={buildingFormData.code}
                    onChange={(e) =>
                      setBuildingFormData({
                        ...buildingFormData,
                        code: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-3 rounded-lg border-0 focus:outline-none bg-gray-50 text-black shadow-sm"
                    placeholder="e.g., SMR"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-black">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  value={buildingFormData.address}
                  onChange={(e) =>
                    setBuildingFormData({
                      ...buildingFormData,
                      address: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-lg border-0 focus:outline-none bg-gray-50 text-black shadow-sm"
                  placeholder="e.g., Gløshaugen Campus"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBuildingModal(false)}
                  className="flex-1 px-6 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-black font-medium cursor-pointer transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-lg font-semibold text-black cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#FFAF76" }}
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : editingBuilding
                    ? "Update"
                    : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
