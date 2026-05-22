fetch('http://localhost:3000/mcp/flag-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        session_id: "eed04f63-437b-476d-b8fd-b82324d7261b",
        flag_type: "emotional_stress",
        ai_confidence: 0.95
    })
})
.then(response => response.json())
.then(data => console.log("Antwort vom Server:", data))
.catch(error => console.error("Netzwerk-Fehler:", error));