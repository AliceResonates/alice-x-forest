import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

// Node 20 hat kein natives WebSocket — supabase-js braucht für den
// (hier ungenutzten) Realtime-Client sonst explizit einen Transport,
// sonst wirft schon der Konstruktor beim Start.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as any } }
);

type LocationResult = { lat: number; lng: number } | null;

const geoCache = new Map<string, LocationResult>();

// Traue keinem externen Geo-Dienst: zippopotam.us lieferte zeitweise fuer
// deutsche PLZ den Gemeindeschluessel als "latitude" (z.B. "04011") und den
// Breitengrad als "longitude". Ungueltige Koordinaten -> Session ohne Ort,
// statt am DB-Check (user_lat -90..90) zu scheitern.
function validCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export async function resolveSessionLocation(zip: string): Promise<LocationResult> {
  if (geoCache.has(zip)) return geoCache.get(zip)!;

  try {
    const { data } = await axios.get(`https://api.zippopotam.us/de/${zip}`, { timeout: 5000 });
    const place = data.places?.[0];
    if (!place) {
      geoCache.set(zip, null);
      return null;
    }
    const lat = parseFloat(place.latitude);
    const lng = parseFloat(place.longitude);
    const result: LocationResult = validCoords(lat, lng) ? { lat, lng } : null;
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
