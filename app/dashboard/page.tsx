"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Room, RoomWithLatestReading } from "@/lib/types";
import { Logo } from "../components/Logo";

export default function DashboardPage() {
  const [rooms, setRooms] = useState<RoomWithLatestReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    room_code: "",
    sensor_id: "",
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
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

  const openCreateModal = () => {
    setEditingRoom(null);
    setFormData({ name: "", room_code: "", sensor_id: "" });
    setShowModal(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      room_code: room.room_code,
      sensor_id: room.sensor_id || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingRoom) {
        // Update existing room
        const response = await fetch(`/api/rooms/${editingRoom.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            sensor_id: formData.sensor_id || null,
          }),
        });

        if (response.ok) {
          await fetchUserRooms();
          setShowModal(false);
        }
      } else {
        // Create new room
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          await fetchUserRooms();
          setShowModal(false);
        }
      }
    } catch (error) {
      console.error("Error saving room:", error);
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchUserRooms();
      }
    } catch (error) {
      console.error("Error deleting room:", error);
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
      <header className="bg-white border-b">
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
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
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
            <h1 className="text-4xl font-bold mb-2 text-black">My Rooms</h1>
            <p className="text-gray-700">
              Manage your air quality monitoring rooms
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-6 py-3 rounded-lg font-semibold text-black"
            style={{ backgroundColor: "#BCF4A8" }}
          >
            + Add Room
          </button>
        </div>

        {/* Rooms Grid */}
        {rooms.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-bold mb-2 text-black">No rooms yet</h3>
            <p className="text-gray-700 mb-6">
              Create your first room to start monitoring air quality
            </p>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 rounded-lg font-semibold text-black"
              style={{ backgroundColor: "#BCF4A8" }}
            >
              Create Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-black">
                      {room.name}
                    </h3>
                    <p className="text-sm text-gray-700">{room.room_code}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Sensor: {room.sensor_id || "Not assigned"}
                    </p>
                  </div>
                  {room.latest_reading && (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
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
                      {getQualityBadge(room.latest_reading.quality_level)}
                    </span>
                  )}
                </div>

                {room.latest_reading ? (
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
                ) : (
                  <div className="text-sm text-gray-700 mb-4">
                    No sensor data yet
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => openEditModal(room)}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-black font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(room.id)}
                    className="flex-1 px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: "#F25E5E" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "#F8F8F8" }}
        >
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-black">
              {editingRoom ? "Edit Room" : "Create New Room"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black">
                  Room Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
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
                    value={formData.room_code}
                    onChange={(e) =>
                      setFormData({ ...formData, room_code: e.target.value })
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
                  value={formData.sensor_id}
                  onChange={(e) =>
                    setFormData({ ...formData, sensor_id: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border-0 focus:outline-none bg-gray-50 text-black shadow-sm"
                  placeholder="e.g., sensor_001"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-black font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-lg font-semibold text-black"
                  style={{ backgroundColor: "#BCF4A8" }}
                >
                  {editingRoom ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
