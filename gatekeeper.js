import express from 'express';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; // Lädt unsere unsichtbaren Schlüssel aus dem Tresor

// 1. App initialisieren
const app = express();
app.use(express.json());

// Die Schlüssel kommen jetzt sicher aus der .env Datei
const supabaseUrl = process.env.SUPABASE_URL;
// Seit der RLS-Härtung (Juli 2026) darf das Frontend (anon) nicht mehr in
// system_hygiene_flags schreiben — der Gatekeeper braucht daher den Service-Role-Key.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY fehlt in der .env — ohne ihn kann der Gatekeeper keine Flags mehr schreiben (RLS blockt den Anon-Key).");
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// ---------------------------------------------------------
// DAS IST UNSER MCP-BYPASS (Türsteher + Logik vereint)
// ---------------------------------------------------------
app.post('/mcp/flag-context', async (req, res) => {
    
    // 1. Der Türsteher: API-Key Check
    const clientKey = req.headers['x-api-key'];
    if (clientKey !== process.env.MCP_SECRET_KEY) {
        console.warn("⛔ Unautorisierter Zugriffsversuch auf den Gatekeeper.");
        return res.status(403).json({ error: 'Access denied.' });
    }

    // 2. Das Paket entgegennehmen
    const { session_id, flag_type, ai_confidence } = req.body;
    console.log(`🛡️ Gatekeeper hat ein Signal empfangen: Typ '${flag_type}'`);

    // 3. Den stillen Alarm sicher in unsere Supabase-Tabelle eintragen
    const { data, error } = await supabase
        .from('system_hygiene_flags')
        .insert([
            {
                session_id: session_id,
                flag_type: flag_type,
                ai_confidence: ai_confidence,
                ui_triggered: false // Das UI hat noch nicht reagiert
            }
        ]);

    // 4. Fehlerbehandlung: Wenn Supabase blockt
    if (error) {
        console.error("❌ Datenbank-Fehler. Supabase hat den Flag abgelehnt:", error);
        return res.status(500).json({ error: 'Fehler beim Speichern der Systemhygiene-Daten.' });
    }

    // 5. Erfolgsmeldung zurücksenden
    console.log("✅ Flag wurde erfolgreich und sicher dokumentiert.");
    res.status(200).json({ message: 'Systemhygiene-Protokoll aktiviert. Daten gesichert.' });
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Alice x Forest: Gatekeeper läuft auf Port ${PORT} 🌲`);
});
