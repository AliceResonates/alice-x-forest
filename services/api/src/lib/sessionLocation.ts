import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type LocationResult = { lat: number; lng: number } | null;

const geoCache = new Map<string, LocationResult>();

export async function resolveSessionLocation(zip: string): Promise<LocationResult> {
  if (geoCache.has(zip)) return geoCache.get(zip)!;

  try {
    const { data } = await axios.get(`https://api.zippopotam.us/de/${zip}`, { timeout: 5000 });
    const place = data.places?.[0];
    if (!place) {
      geoCache.set(zip, null);
      return null;
    }
    const result: LocationResult = {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
    };
    geoCache.set(zip, result);
    return result;
  } catch {
    geoCache.set(zip, null);
    return null;
  }
}

export async function createSession(
  user_zip: string,
  user_lat: number | null,
  user_lng: number | null
): Promise<string> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_zip, user_lat, user_lng })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}
