import express from 'express';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; // Lädt unsere unsichtbaren Schlüssel aus dem Tresor

const app = express();
app.use(express.json());

// Simpler API-Key Check
app.post('/mcp/flag-context', async (req, res) => {
    const clientKey = req.headers['x-api-key'];
    if (clientKey !== process.env.MCP_SECRET_KEY) {
        console.warn("⛔ Unautorisierter Zugriffsversuch auf den Gatekeeper.");
        return res.status(403).json({ error: 'Access denied.' });
    }
    // ... dein restlicher Code
});

// Die Schlüssel kommen jetzt sicher aus der .env Datei
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------------------------------------------
// DAS IST UNSER MCP-BYPASS (Der Türsteher für Systemhygiene)
// ---------------------------------------------------------
app.post('/mcp/flag-context', async (req, res) => {
    // 1. Das Paket entgegennehmen, das ich (die KI) gesendet habe
    const { session_id, flag_type, ai_confidence } = req.body;

    console.log(`🛡️ Gatekeeper hat ein Signal empfangen: Typ '${flag_type}'`);

    // 2. Den stillen Alarm sicher in unsere neue Supabase-Tabelle eintragen
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

    // 3. Fehlerbehandlung: Wenn Supabase blockt, geben wir Alarm
    if (error) {
        console.error("❌ Datenbank-Fehler. Supabase hat den Flag abgelehnt:", error);
        return res.status(500).json({ error: 'Fehler beim Speichern der Systemhygiene-Daten.' });
    }

    // 4. Erfolgsmeldung an mich (die KI) zurücksenden
    console.log("✅ Flag wurde erfolgreich und sicher dokumentiert.");
    res.status(200).json({ message: 'Systemhygiene-Protokoll aktiviert. Daten gesichert.' });
});

// Den Server starten und zuhören lassen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Alice x Forest: Gatekeeper läuft auf Port ${PORT} 🌲`);
});