import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateAirQuality } from "@/lib/air-quality";

// Use service role key for Node-RED to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { sensor_id, temperature, humidity, co2 } = body;

    // Validate input
    if (
      !sensor_id ||
      temperature === undefined ||
      humidity === undefined ||
      co2 === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: sensor_id, temperature, humidity, co2",
        },
        { status: 400 }
      );
    }

    // Validate data types
    const temp = parseFloat(temperature);
    const hum = parseFloat(humidity);
    const co2Val = parseInt(co2);

    if (isNaN(temp) || isNaN(hum) || isNaN(co2Val)) {
      return NextResponse.json(
        { error: "Invalid data types for temperature, humidity, or co2" },
        { status: 400 }
      );
    }

    // Find room by sensor_id
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .eq("sensor_id", sensor_id)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: `No room found with sensor_id: ${sensor_id}` },
        { status: 404 }
      );
    }

    // Calculate air quality
    const airQuality = calculateAirQuality(temp, hum, co2Val);

    // Insert sensor reading
    const { data: reading, error: insertError } = await supabaseAdmin
      .from("sensor_readings")
      .insert({
        room_id: room.id,
        sensor_id,
        temperature: temp,
        humidity: hum,
        co2: co2Val,
        quality_score: airQuality.score,
        quality_level: airQuality.level,
        recommendations: airQuality.recommendations,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting sensor reading:", insertError);
      return NextResponse.json(
        { error: "Failed to save sensor reading" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reading,
      air_quality: airQuality,
    });
  } catch (error) {
    console.error("Error processing sensor data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to test the API
export async function GET() {
  return NextResponse.json({
    message: "AirSense Sensor Data API",
    usage: "POST sensor data with: { sensor_id, temperature, humidity, co2 }",
    example: {
      sensor_id: "sensor_001",
      temperature: 22.5,
      humidity: 45,
      co2: 650,
    },
  });
}
