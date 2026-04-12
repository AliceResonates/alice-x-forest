import express from "express";
import cors from "cors";
import { routeMessage } from "../logic/routing.ts";

const app = express();
app.use(cors());
app.use(express.json());

// Test-Route
app.get("/", (req, res) => {
    res.send("Wald-Server läuft 🌲");
});

// Haupt-API
app.post("/api/chat", async (req, res) => {
    try {
        const { message, override, previousSummaryModel } = req.body;

        if (!message) {
            return res.status(400).json({ error: "message fehlt" });
        }

        const result = await routeMessage(
            message,
            override,
            previousSummaryModel
        );

        res.json(result);
    } catch (err) {
        console.error("Fehler im Server:", err);
        res.status(500).json({ error: "Interner Serverfehler" });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Wald-Server läuft auf Port ${PORT}`);
});
