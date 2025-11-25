import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET a single building with its rooms
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Get building
  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("*")
    .eq("id", id)
    .single();

  if (buildingError) {
    return NextResponse.json({ error: buildingError.message }, { status: 500 });
  }

  if (!building) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }

  // Get rooms for this building with latest sensor readings
  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("building_id", id)
    .order("created_at", { ascending: false });

  const roomsWithReadings = await Promise.all(
    (rooms || []).map(async (room) => {
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

  return NextResponse.json({
    ...building,
    rooms: roomsWithReadings,
  });
}

// PATCH update a building
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, address } = body;

    const { data: building, error } = await supabase
      .from("buildings")
      .update({
        name,
        address: address || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!building) {
      return NextResponse.json(
        { error: "Building not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(building);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// DELETE a building (cascade deletes all rooms)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("buildings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
