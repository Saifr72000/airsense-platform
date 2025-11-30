/**
 * Sensor utility functions for processing raw sensor data
 */

/**
 * Convert raw ADC value (0-1023) from MG811 CO2 sensor to ppm
 * The micro:bit uses a 10-bit ADC, giving values from 0 to 1023
 *
 * Calibration reference:
 * - Fresh air (~400 ppm): ~310-350 ADC
 * - 1000 ppm CO₂: ~370 ADC
 * - 2000 ppm CO₂: ~430 ADC
 * - 5000 ppm CO₂: ~530 ADC
 */
export function convertRawCO2ToPPM(rawADC: number): number {
  // Handle invalid readings
  if (rawADC === -999 || rawADC < 0 || rawADC > 1023) {
    return -999; // Return -999 to indicate invalid reading
  }

  // Using linear interpolation based on calibration data
  // We'll create a piecewise linear function based on the reference points
  const calibrationPoints = [
    { adc: 310, ppm: 400 }, // Fresh air (lower bound)
    { adc: 350, ppm: 400 }, // Fresh air (upper bound)
    { adc: 370, ppm: 1000 }, // 1000 ppm
    { adc: 430, ppm: 2000 }, // 2000 ppm
    { adc: 530, ppm: 5000 }, // 5000 ppm
  ];

  // If below fresh air range, assume fresh air
  if (rawADC < 310) {
    return 400;
  }

  // If above maximum calibration, extrapolate (but cap at reasonable value)
  if (rawADC > 530) {
    // Extrapolate beyond 5000 ppm
    const slope = (5000 - 2000) / (530 - 430);
    const extrapolated = 5000 + slope * (rawADC - 530);
    return Math.min(Math.round(extrapolated), 10000); // Cap at 10000 ppm
  }

  // Find the two calibration points to interpolate between
  for (let i = 0; i < calibrationPoints.length - 1; i++) {
    const point1 = calibrationPoints[i];
    const point2 = calibrationPoints[i + 1];

    if (rawADC >= point1.adc && rawADC <= point2.adc) {
      // Linear interpolation
      const slope = (point2.ppm - point1.ppm) / (point2.adc - point1.adc);
      const ppm = point1.ppm + slope * (rawADC - point1.adc);
      return Math.round(ppm);
    }
  }

  // Fallback (should not reach here)
  return 400;
}

/**
 * Process sensor data from Node-RED WebSocket payload
 */
export interface NodeRedSensorPayload {
  "airsense/tempDHT": number;
  "airsense/humidity": number;
  "airsense/tempDS": number;
  "airsense/co2": number;
}

export interface ProcessedSensorData {
  temperature: number;
  humidity: number;
  co2: number; // in ppm
  rawCO2: number; // raw ADC value
  isValid: boolean;
}

/**
 * Process raw sensor payload from Node-RED
 */
export function processSensorPayload(
  payload: NodeRedSensorPayload
): ProcessedSensorData {
  // Use tempDS (DS18B20) as primary temperature, fallback to DHT if needed
  const tempDS = payload["airsense/tempDS"];
  const tempDHT = payload["airsense/tempDHT"];
  const temperature =
    tempDS !== undefined && tempDS !== -999
      ? tempDS
      : tempDHT !== undefined
      ? tempDHT
      : -999;

  const humidity = payload["airsense/humidity"] ?? -999;
  const rawCO2 = payload["airsense/co2"] ?? -999;
  const co2PPM = convertRawCO2ToPPM(rawCO2);

  // Check if we have valid readings - require at least temp and CO2
  // Humidity can be invalid without blocking the display
  const isValid = temperature !== -999 && co2PPM !== -999;

  return {
    temperature: temperature !== -999 ? Number(temperature.toFixed(1)) : -999,
    humidity: humidity !== -999 ? Math.round(humidity) : -999,
    co2: co2PPM,
    rawCO2: rawCO2,
    isValid,
  };
}
