"use client";

import { ProcessedSensorData } from "@/lib/sensor-utils";
import { calculateAirQuality } from "@/lib/air-quality";
import { QualityIcon } from "./QualityIcon";

interface LiveSensorCardProps {
  data: ProcessedSensorData | null;
  isConnected: boolean;
  error: string | null;
  roomName?: string;
  roomCode?: string;
  onReconnect?: () => void;
}

export function LiveSensorCard({
  data,
  isConnected,
  error,
  roomName = "Group Room 1",
  roomCode = "S307",
  onReconnect,
}: LiveSensorCardProps) {
  // Calculate air quality if we have valid data
  // Use default humidity of 50% if sensor is not working
  const airQuality =
    data && data.isValid
      ? calculateAirQuality(
          data.temperature,
          data.humidity !== -999 ? data.humidity : 50,
          data.co2
        )
      : null;

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

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        backgroundColor: "#FBFBFB",
        boxShadow: "0px 2px 10px 0px rgba(19, 19, 19, 0.25)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-black">{roomName}</h3>
          <p className="text-sm text-gray-600">{roomCode}</p>
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs text-gray-600">
              {isConnected ? "Live" : "Disconnected"}
            </span>
            {data && (
              <span className="text-xs text-gray-500">
                (Raw CO₂: {data.rawCO2})
              </span>
            )}
          </div>
        </div>
        {airQuality && (
          <div className="flex items-center gap-2">
            <QualityIcon level={airQuality.level} variant="filled" />
            <span
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: getQualityColor(airQuality.level),
                color: airQuality.level === "poor" ? "white" : "black",
              }}
            >
              {getQualityBadge(airQuality.level)}
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
          {onReconnect && (
            <button
              onClick={onReconnect}
              className="mt-2 text-sm text-red-700 font-semibold hover:underline cursor-pointer"
            >
              Try Reconnecting
            </button>
          )}
        </div>
      )}

      {/* Sensor Readings */}
      {data && data.isValid ? (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <span className="mr-2 text-xl">💨</span>
                <span>CO₂</span>
              </div>
              <div className="text-2xl font-bold text-black">
                {data.co2 !== -999 ? data.co2 : "N/A"}
              </div>
              <div className="text-xs text-gray-500 mt-1">ppm</div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <span className="mr-2 text-xl">🌡️</span>
                <span>Temperature</span>
              </div>
              <div className="text-2xl font-bold text-black">
                {data.temperature !== -999 ? `${data.temperature}°` : "N/A"}
              </div>
              <div className="text-xs text-gray-500 mt-1">celsius</div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <span className="mr-2 text-xl">💧</span>
                <span>Humidity</span>
              </div>
              <div className="text-2xl font-bold text-black">
                {data.humidity !== -999 ? `${data.humidity}%` : "N/A"}
              </div>
              <div className="text-xs text-gray-500 mt-1">relative</div>
            </div>
          </div>

          {/* Air Quality Score and Recommendations */}
          {airQuality && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">
                  Air Quality Score
                </span>
                <span className="text-lg font-bold text-black">
                  {airQuality.score}/100
                </span>
              </div>

              {airQuality.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Recommendations:
                  </h4>
                  <ul className="space-y-1">
                    {airQuality.recommendations.map((rec, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-600 flex items-start"
                      >
                        <span className="mr-2">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📡</div>
          <p className="text-gray-600">
            {isConnected
              ? "Waiting for sensor data..."
              : "Please check Node-RED connection"}
          </p>
          {!isConnected && (
            <p className="text-sm text-gray-500 mt-2">
              Make sure Node-RED is running at ws://localhost:1880/ws/sensors
            </p>
          )}
        </div>
      )}
    </div>
  );
}
