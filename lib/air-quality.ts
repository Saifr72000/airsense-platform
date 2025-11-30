import { AirQualityResult, QualityLevel } from "./types";

// Thresholds for air quality parameters
const THRESHOLDS = {
  co2: {
    good: 800, // Below 800 ppm is good
    moderate: 1200, // 800-1200 ppm is moderate
    // Above 1200 ppm is poor
  },
  temperature: {
    min: 18, // Below 18°C is too cold
    optimal_min: 20,
    optimal_max: 24,
    max: 26, // Above 26°C is too hot
  },
  humidity: {
    min: 30, // Below 30% is too dry
    optimal_min: 40,
    optimal_max: 60,
    max: 70, // Above 70% is too humid
  },
};

/**
 * Calculate air quality score based on temperature, humidity, and CO2 levels
 * Score ranges from 0-100, where 100 is perfect air quality
 */
export function calculateAirQuality(
  temperature: number,
  humidity: number,
  co2: number
): AirQualityResult {
  let score = 100;
  const recommendations: string[] = [];

  // CO2 Score (weighted 40%)
  let co2Score = 100;
  if (co2 <= THRESHOLDS.co2.good) {
    co2Score = 100;
  } else if (co2 <= THRESHOLDS.co2.moderate) {
    // Linear scale from 100 to 60
    co2Score =
      100 -
      ((co2 - THRESHOLDS.co2.good) /
        (THRESHOLDS.co2.moderate - THRESHOLDS.co2.good)) *
        40;
  } else {
    // Linear scale from 60 to 0
    co2Score = Math.max(0, 60 - ((co2 - THRESHOLDS.co2.moderate) / 800) * 60);
  }

  if (co2 > THRESHOLDS.co2.moderate) {
    recommendations.push(
      `CO₂ is too high (${co2} ppm). Open windows immediately to improve ventilation`
    );
    recommendations.push("Consider using mechanical ventilation if available");
  } else if (co2 > THRESHOLDS.co2.good) {
    recommendations.push(
      `CO₂ is slightly elevated (${co2} ppm). Opening a window would help improve air quality`
    );
  }

  // Temperature Score (weighted 30%)
  let tempScore = 100;
  if (temperature < THRESHOLDS.temperature.min) {
    tempScore = Math.max(
      0,
      50 - (THRESHOLDS.temperature.min - temperature) * 10
    );
    recommendations.push(
      `Temperature is too cold (${temperature.toFixed(
        1
      )}°C). Turn on heating for better comfort`
    );
  } else if (temperature > THRESHOLDS.temperature.max) {
    tempScore = Math.max(
      0,
      50 - (temperature - THRESHOLDS.temperature.max) * 10
    );
    recommendations.push(
      `Temperature is too warm (${temperature.toFixed(
        1
      )}°C). Open windows or adjust air conditioning`
    );
  } else if (temperature < THRESHOLDS.temperature.optimal_min) {
    tempScore =
      50 +
      ((temperature - THRESHOLDS.temperature.min) /
        (THRESHOLDS.temperature.optimal_min - THRESHOLDS.temperature.min)) *
        50;
  } else if (temperature > THRESHOLDS.temperature.optimal_max) {
    tempScore =
      50 +
      ((THRESHOLDS.temperature.max - temperature) /
        (THRESHOLDS.temperature.max - THRESHOLDS.temperature.optimal_max)) *
        50;
  } else {
    tempScore = 100;
  }

  // Humidity Score (weighted 30%)
  let humidityScore = 100;
  if (humidity < THRESHOLDS.humidity.min) {
    humidityScore = Math.max(0, 50 - (THRESHOLDS.humidity.min - humidity) * 2);
    recommendations.push(
      `Humidity is too low (${humidity}%). Use a humidifier or place water containers in the room`
    );
  } else if (humidity > THRESHOLDS.humidity.max) {
    humidityScore = Math.max(0, 50 - (humidity - THRESHOLDS.humidity.max) * 2);
    recommendations.push(
      `Humidity is too high (${humidity}%). Use a dehumidifier or open windows to increase airflow`
    );
  } else if (humidity < THRESHOLDS.humidity.optimal_min) {
    humidityScore =
      50 +
      ((humidity - THRESHOLDS.humidity.min) /
        (THRESHOLDS.humidity.optimal_min - THRESHOLDS.humidity.min)) *
        50;
  } else if (humidity > THRESHOLDS.humidity.optimal_max) {
    humidityScore =
      50 +
      ((THRESHOLDS.humidity.max - humidity) /
        (THRESHOLDS.humidity.max - THRESHOLDS.humidity.optimal_max)) *
        50;
  } else {
    humidityScore = 100;
  }

  // Calculate weighted total score
  score = Math.round(co2Score * 0.4 + tempScore * 0.3 + humidityScore * 0.3);

  // Determine quality level
  let level: QualityLevel;
  if (score >= 70) {
    level = "good";
    if (recommendations.length === 0) {
      recommendations.push(
        "Air quality is excellent! This is a great space for focused work or study sessions"
      );
    }
  } else if (score >= 40) {
    level = "moderate";
    if (recommendations.length === 0) {
      recommendations.push(
        "Air quality is acceptable but could be improved. Consider taking a short break"
      );
    }
  } else {
    level = "poor";
    if (recommendations.length === 0) {
      recommendations.push(
        "Air quality needs immediate attention. Take action to improve conditions"
      );
    }
  }

  return {
    score,
    level,
    recommendations,
  };
}

/**
 * Get color for quality level
 */
export function getQualityColor(level: QualityLevel): string {
  switch (level) {
    case "good":
      return "#BCF4A8";
    case "moderate":
      return "#FFAF76";
    case "poor":
      return "#F25E5E";
    default:
      return "#F8F8F8";
  }
}

/**
 * Get emoji for quality level
 */
export function getQualityEmoji(level: QualityLevel): string {
  switch (level) {
    case "good":
      return "😊";
    case "moderate":
      return "😐";
    case "poor":
      return "😟";
    default:
      return "❓";
  }
}
