import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET all rooms with latest sensor readings
export async function GET() {
  const supabase = await createClient();

  // Get all rooms
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("*")
    .order("created_at", { ascending: false });

  if (roomsError) {
    return NextResponse.json({ error: roomsError.message }, { status: 500 });
  }

  // Get latest reading for each room
  const roomsWithReadings = await Promise.all(
    rooms.map(async (room) => {
      const { data: latestReading } = await supabase
        .from("sensor_readings")
        .select("*")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...room,
        latest_reading: latestReading || null,
      };
    })
  );

  return NextResponse.json(roomsWithReadings);
}

// POST create a new room
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, room_code, building_id, sensor_id } = body;

    if (!name || !room_code || !building_id) {
      return NextResponse.json(
        { error: "Missing required fields: name, room_code, building_id" },
        { status: 400 }
      );
    }

    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        name,
        room_code,
        building_id,
        sensor_id: sensor_id || null,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
