import express from "express";
import cors from "cors";
import { routeMessage } from "../logic/routing";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/forest", async (req, res) => {
    const { message, override } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required." });
    }

    try {
        const result = await routeMessage(message, override);
        res.json(result);
    } catch (err) {
        console.error("Fehler im Wald:", err);
        res.status(500).json({ error: "Interner Fehler im Wald." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Wald-Server läuft auf Port ${PORT}`);
});
