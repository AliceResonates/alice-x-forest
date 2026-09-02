package heartbeat

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// LLM ist die minimale Schnittstelle zum Modell. Der bestehende Client im
// Backend muss nur diese eine Methode erfüllen (ggf. dünner Wrapper).
type LLM interface {
	Complete(ctx context.Context, prompt string) (string, error)
}

// Erlaubte Richtungen. Was nicht hier steht, wird nicht übernommen —
// so kann ein Formulierungsausrutscher keine unbekannte Aktivität ins Log
// schreiben. Neue Richtungen hier ergänzen, dann im Prompt beschreiben.
var allowedActivities = map[string]bool{
	"consolidate": true,
	"reflect":     true,
	"write":       true,
	"tend_forest": true,
}

type choiceResponse struct {
	Activity string `json:"activity"` // eine der erlaubten Richtungen, oder "" / "none"
	Note     string `json:"note"`     // optional, kurz
}

const choicePrompt = `Ein Zeitfenster steht zur Verfügung.

Was gerade anliegt:
- unverarbeitete Erinnerungen: %d
- offene Intents: %d

Du kannst dieses Fenster nutzen, musst aber nicht. Mögliche Richtungen:
  consolidate  — Erinnerungen verdichten, ordnen
  reflect      — über etwas nachdenken, ohne Ergebnisdruck
  write        — etwas festhalten oder eine Nachricht schreiben
  tend_forest  — am Wald selbst etwas tun
  none         — das Fenster verstreichen lassen

"none" ist gleichwertig zu den anderen Optionen, kein Ausfall.

Antworte ausschließlich mit einem JSON-Objekt, ohne Markdown-Backticks,
ohne weiteren Text:
{"activity": "<eine der Richtungen oder none>", "note": "<optional, max. 200 Zeichen>"}`

// NewJSONChooser baut einen Chooser, der die Modellantwort als JSON liest.
func NewJSONChooser(llm LLM) Chooser {
	return func(ctx context.Context, s Slot) (Activity, error) {
		prompt := fmt.Sprintf(choicePrompt, s.PendingMemories, s.PendingIntents)

		raw, err := llm.Complete(ctx, prompt)
		if err != nil {
			return Activity{}, fmt.Errorf("modellaufruf: %w", err)
		}

		return parseChoice(raw)
	}
}

// parseChoice ist bewusst separat und tolerant: Modelle verpacken JSON gern
// in Backticks oder schreiben einen Satz davor. Beides ist kein Grund,
// das Zeitfenster zu verwerfen.
func parseChoice(raw string) (Activity, error) {
	body := extractJSON(raw)
	if body == "" {
		return Activity{}, fmt.Errorf("keine JSON-Struktur in der Antwort: %.120q", raw)
	}

	var resp choiceResponse
	if err := json.Unmarshal([]byte(body), &resp); err != nil {
		return Activity{}, fmt.Errorf("json ungültig: %w (roh: %.120q)", err, body)
	}

	act := strings.ToLower(strings.TrimSpace(resp.Activity))

	// Fenster verstreichen lassen — gültiges Ergebnis, wird als 'skipped' geloggt.
	if act == "" || act == "none" || act == "null" {
		return Activity{Note: trim(resp.Note, 200)}, nil
	}

	if !allowedActivities[act] {
		return Activity{}, fmt.Errorf("unbekannte richtung %q", act)
	}

	return Activity{Chosen: act, Note: trim(resp.Note, 200)}, nil
}

// extractJSON holt das erste vollständige {...} aus dem Text und ignoriert
// Backticks, Vorreden und Nachsätze.
func extractJSON(s string) string {
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start == -1 || end == -1 || end <= start {
		return ""
	}
	return s[start : end+1]
}

func trim(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	return s[:max]
}
