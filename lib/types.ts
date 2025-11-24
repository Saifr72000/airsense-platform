export interface Room {
  id: string;
  name: string;
  room_code: string;
  sensor_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface SensorReading {
  id: string;
  room_id: string;
  sensor_id: string;
  temperature: number;
  humidity: number;
  co2: number;
  quality_score: number | null;
  quality_level: "good" | "moderate" | "poor" | null;
  recommendations: string[] | null;
  created_at: string;
}

export interface RoomWithLatestReading extends Room {
  latest_reading: SensorReading | null;
}

export type QualityLevel = "good" | "moderate" | "poor";

export interface AirQualityResult {
  score: number;
  level: QualityLevel;
  recommendations: string[];
}
