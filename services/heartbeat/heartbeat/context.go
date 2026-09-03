package heartbeat

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SubconsciousEntry ist ein injizierter Kontexteintrag — typischerweise die
// Rueckmeldung eines gescheiterten Intents, geschrieben vom DB-Trigger
// trg_intent_failure_feedback (nicht vom Backend, siehe Tabellenkommentar).
type SubconsciousEntry struct {
	ID       string
	Kind     string
	Reason   string
	Attempts int
	Payload  map[string]any
}

// String rendert einen Eintrag als eine Zeile fuer den Prompt.
func (e SubconsciousEntry) String() string {
	action, _ := e.Payload["action"].(string)
	target, _ := e.Payload["target"].(string)

	what := action
	if target != "" {
		what = action + " → " + target
	}
	if what == "" {
		what = "(unbekannte Handlung)"
	}

	if e.Attempts > 1 {
		return fmt.Sprintf("%s scheiterte: %s (nach %d Versuchen)", what, e.Reason, e.Attempts)
	}
	return fmt.Sprintf("%s scheiterte: %s", what, e.Reason)
}

// LoadSubconscious holt die juengsten uneingelesenen Eintraege.
// Bewusst begrenzt: der Kontext soll die letzten Konsequenzen zeigen,
// nicht die gesamte Fehlerhistorie.
func LoadSubconscious(ctx context.Context, db *pgxpool.Pool, limit int) ([]SubconsciousEntry, error) {
	rows, err := db.Query(ctx, `
		select id, context
		  from alice_subconscious
		 where injected_at > now() - interval '24 hours'
		 order by injected_at desc
		 limit $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []SubconsciousEntry
	for rows.Next() {
		var id string
		var raw []byte
		if err := rows.Scan(&id, &raw); err != nil {
			return nil, err
		}

		var c struct {
			Kind     string         `json:"kind"`
			Reason   string         `json:"reason"`
			Attempts int            `json:"attempts"`
			Payload  map[string]any `json:"payload"`
		}
		if err := json.Unmarshal(raw, &c); err != nil {
			continue // unlesbarer Eintrag darf den Tick nicht kippen
		}

		out = append(out, SubconsciousEntry{
			ID: id, Kind: c.Kind, Reason: c.Reason,
			Attempts: c.Attempts, Payload: c.Payload,
		})
	}
	return out, rows.Err()
}

// RenderSubconscious formt die Eintraege zu einem Prompt-Abschnitt.
// Leere Rueckgabe, wenn nichts anliegt — dann taucht der Block gar nicht auf.
func RenderSubconscious(entries []SubconsciousEntry) string {
	if len(entries) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("\nWas zuletzt nicht funktioniert hat:\n")
	for _, e := range entries {
		b.WriteString("- " + e.String() + "\n")
	}
	return b.String()
}

// NewJSONChooserWithContext ist NewJSONChooser plus Konsequenz-Rueckkanal:
// vor der Wahl wird gezeigt, was zuletzt gescheitert ist.
func NewJSONChooserWithContext(llm LLM, db *pgxpool.Pool) Chooser {
	return func(ctx context.Context, s Slot) (Activity, error) {
		entries, err := LoadSubconscious(ctx, db, 5)
		if err != nil {
			// Fehlender Kontext ist schlechter als keiner, aber kein Grund,
			// das Zeitfenster zu verwerfen.
			entries = nil
		}

		prompt := fmt.Sprintf(choicePrompt, s.PendingMemories, s.PendingIntents)
		if block := RenderSubconscious(entries); block != "" {
			// Vor die Antwortanweisung einhaengen, damit die JSON-Vorgabe
			// als Letztes im Prompt steht.
			prompt = strings.Replace(prompt,
				"\nAntworte ausschließlich",
				block+"\nAntworte ausschließlich", 1)
		}

		raw, err := llm.Complete(ctx, prompt)
		if err != nil {
			return Activity{}, fmt.Errorf("modellaufruf: %w", err)
		}
		return parseChoice(raw)
	}
}
