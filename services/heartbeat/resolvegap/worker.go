// Package resolvegap ist ein eigenstaendiger Poller, unabhaengig vom
// heartbeat_slots-Mechanismus: er zieht offene resolve_gap-Intents aus
// intent_inbox, laesst Alice extern nachschlagen (via
// alice-x-forest-api /api/knowledge/search) und schliesst bei Erfolg
// den epistemischen Gap, den der Intent referenziert.
//
// Bewusst NICHT als heartbeat.Chooser gebaut: intent_inbox ist eine
// andere Tabelle mit anderer Claim-/Retry-Semantik als heartbeat_slots
// (Visibility-Timeout statt Slot-Status, Backoff statt "ein Versuch").
// Eine gemeinsame Abstraktion wuerde beide Konzepte nur verwaschen.
package resolvegap

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	maxAttempts = 5
	actionName  = "resolve_gap"

	// HTTP-Budget fuer den Suchaufruf. Muss deutlich unter staleMinutes
	// bleiben, sonst requeued claim_pending_intents' Stale-Recovery den
	// Intent, waehrend der erste Versuch noch im Aufruf haengt, und ein
	// zweiter Worker greift ihn parallel auf. Bewusster Startwert, nicht
	// in Stein gemeisselt -- neu bewerten, falls Embedding-Kaltstarts/
	// Tavily regelmaessig in die Naehe kommen.
	searchTimeout = 90 * time.Second
	staleMinutes  = 5
	pollInterval  = 2 * time.Minute
)

type Worker struct {
	db           *pgxpool.Pool
	httpClient   *http.Client
	knowledgeURL string
	log          *slog.Logger
}

func New(db *pgxpool.Pool, knowledgeURL string, log *slog.Logger) *Worker {
	return &Worker{
		db:           db,
		httpClient:   &http.Client{Timeout: searchTimeout},
		knowledgeURL: knowledgeURL,
		log:          log,
	}
}

// Run laeuft, bis der Context abgebrochen wird. In main als eigene
// Goroutine starten, unabhaengig vom heartbeat.Runner:
//
//	w := resolvegap.New(pool, knowledgeURL, logger)
//	go w.Run(ctx)
func (w *Worker) Run(ctx context.Context) {
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	w.log.Info("resolve-gap worker gestartet", "interval", pollInterval)

	for {
		select {
		case <-ctx.Done():
			w.log.Info("resolve-gap worker beendet")
			return
		case <-ticker.C:
			if err := w.processOne(ctx); err != nil {
				w.log.Error("resolve-gap-durchlauf fehlgeschlagen", "err", err)
			}
		}
	}
}

type claimedIntent struct {
	ID        string
	SessionID *string
	Payload   []byte
	Attempts  int
}

// Eingefrorener Payload-Vertrag (siehe Absprache): action, gap_id, query
// sind Pflicht, tags optional. session_id kommt aus der Spalte des
// Intents selbst, nicht zusaetzlich aus dem Payload -- die Spalte ist
// bereits die verbindliche Quelle.
type gapPayload struct {
	Action string   `json:"action"`
	GapID  string   `json:"gap_id"`
	Query  string   `json:"query"`
	Tags   []string `json:"tags"`
}

func (w *Worker) processOne(ctx context.Context) error {
	intent, err := w.claim(ctx)
	if err != nil {
		return fmt.Errorf("claim: %w", err)
	}
	if intent == nil {
		return nil // nichts offen -- normal
	}

	var payload gapPayload
	if err := json.Unmarshal(intent.Payload, &payload); err != nil {
		return w.reject(ctx, intent, fmt.Sprintf("payload nicht lesbar: %v", err))
	}
	// Explizite Validierung, wie besprochen: ein falsch geformter Intent
	// darf nicht denselben Worker mit unpassenden Annahmen durchlaufen.
	if payload.Action != "resolve_gap" {
		return w.reject(ctx, intent, fmt.Sprintf("unerwartete action %q, erwarte resolve_gap", payload.Action))
	}
	if payload.GapID == "" || payload.Query == "" {
		return w.reject(ctx, intent, "gap_id oder query fehlt im payload")
	}

	w.log.Info("resolve_gap-intent aufgegriffen", "intent", intent.ID, "gap_id", payload.GapID)

	searchCtx, cancel := context.WithTimeout(ctx, searchTimeout)
	defer cancel()

	if err := w.dispatchSearch(searchCtx, payload); err != nil {
		return w.fail(ctx, intent, err.Error())
	}

	sessionID := ""
	if intent.SessionID != nil {
		sessionID = *intent.SessionID
	}
	return w.complete(ctx, intent, payload.GapID, sessionID)
}

func (w *Worker) claim(ctx context.Context) (*claimedIntent, error) {
	// Dritte, generische Ueberladung (von Fable/Roots eingefuehrt):
	// claim_pending_intents(p_action, p_batch, p_stale_minutes). Filtert
	// serverseitig auf payload->>'action' = p_action, damit sich
	// resolve_gap und save_memory nie gegenseitig die Queue wegschnappen.
	// Erhoeht attempts selbst beim Claim -- siehe fail().
	rows, err := w.db.Query(ctx,
		`select id, session_id, payload, attempts
		   from claim_pending_intents(p_action := $1, p_batch := 1, p_stale_minutes := $2)`,
		actionName, staleMinutes,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, rows.Err()
	}

	var i claimedIntent
	if err := rows.Scan(&i.ID, &i.SessionID, &i.Payload, &i.Attempts); err != nil {
		return nil, err
	}
	return &i, nil
}

type searchResponse struct {
	ID string `json:"id"`
}

func (w *Worker) dispatchSearch(ctx context.Context, payload gapPayload) error {
	body, err := json.Marshal(map[string]any{
		"query":  payload.Query,
		"tags":   payload.Tags,
		"intent": "resolve_gap",
	})
	if err != nil {
		return fmt.Errorf("request kodieren: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, w.knowledgeURL+"/api/knowledge/search", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("request bauen: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := w.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("knowledge-search aufruf: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("knowledge-search status %d: %s", resp.StatusCode, truncate(string(respBody), 300))
	}

	var parsed searchResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return fmt.Errorf("antwort dekodieren: %w", err)
	}
	if parsed.ID == "" {
		return fmt.Errorf("antwort ohne id")
	}
	return nil
}

// complete markiert den Intent als erledigt und raeumt bei bekannter
// Session den referenzierten Gap aus shadow_context auf -- beides in
// einer Transaktion, aber erst NACH dem externen HTTP-Aufruf, nie
// waehrenddessen (eine Transaktion ueber einen Netzwerkaufruf offen zu
// halten waere ein Antipattern).
func (w *Worker) complete(ctx context.Context, intent *claimedIntent, gapID, sessionID string) error {
	tx, err := w.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaktion starten: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx,
		`update intent_inbox set status = 'done', processed_at = now()
		 where id = $1 and status = 'processing'`,
		intent.ID,
	)
	if err != nil {
		return fmt.Errorf("intent abschliessen: %w", err)
	}

	// Nur wenn dieser Aufruf den Intent tatsaechlich abgeschlossen hat
	// (nicht schon durch einen vorherigen, ueberlappenden Versuch),
	// den Gap entfernen und den Zaehler erhoehen -- verhindert doppeltes
	// Aufraeumen/Zaehlen bei ueberlappender Verarbeitung (Idempotenz).
	if tag.RowsAffected() == 1 && sessionID != "" {
		if _, err := tx.Exec(ctx,
			`update shadow_context
			    set epistemic_gaps = epistemic_gaps - $1,
			        agency_metrics = jsonb_set(
			          agency_metrics, '{resolved_gaps}',
			          to_jsonb(coalesce((agency_metrics->>'resolved_gaps')::int, 0) + 1)
			        ),
			        updated_at = now()
			  where conversation_id = $2`,
			gapID, sessionID,
		); err != nil {
			return fmt.Errorf("shadow_context aufraeumen: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transaktion abschliessen: %w", err)
	}

	w.log.Info("gap aufgeloest", "intent", intent.ID, "gap_id", gapID)
	return nil
}

// fail behandelt einen technischen Fehlschlag (z.B. HTTP-Fehler): solange
// das Attempt-Limit nicht erreicht ist, geht der Intent mit Backoff
// zurueck auf 'pending' -- claim_pending_intents greift ihn dann von
// selbst wieder auf, sobald next_attempt_at erreicht ist. Erst danach
// ist er endgueltig 'failed'.
func (w *Worker) fail(ctx context.Context, intent *claimedIntent, reason string) error {
	// claim_pending_intents(p_action, p_batch, p_stale_minutes) erhoeht
	// attempts bereits selbst beim Claim (anders als die aeltere
	// (p_batch_size, p_visibility_timeout)-Ueberladung) -- intent.Attempts
	// ist hier also schon der aktuelle Versuchszaehler. Hier NICHT nochmal
	// erhoehen, sonst zaehlt jeder Fehlschlag doppelt.
	if intent.Attempts >= maxAttempts {
		_, err := w.db.Exec(ctx,
			`update intent_inbox set status = 'failed', last_error = $1
			 where id = $2 and status = 'processing'`,
			reason, intent.ID,
		)
		w.log.Error("resolve_gap endgueltig fehlgeschlagen", "intent", intent.ID, "attempts", intent.Attempts, "err", reason)
		return err
	}

	exponent := intent.Attempts - 1
	if exponent < 0 {
		exponent = 0
	}
	backoff := time.Duration(1<<uint(exponent)) * 30 * time.Second // 30s, 60s, 120s, 240s, 480s
	if backoff > 10*time.Minute {
		backoff = 10 * time.Minute
	}

	_, err := w.db.Exec(ctx,
		`update intent_inbox
		    set status = 'pending', last_error = $1, next_attempt_at = now() + $2::interval
		  where id = $3 and status = 'processing'`,
		reason, backoff.String(), intent.ID,
	)
	w.log.Error("resolve_gap fehlgeschlagen, retry geplant", "intent", intent.ID, "versuch", intent.Attempts, "in", backoff, "err", reason)
	return err
}

// reject behandelt einen dauerhaft ungueltigen Intent (falsche action,
// fehlende Pflichtfelder) -- ein Retry wuerde am selben Payload erneut
// scheitern, also sofort und endgueltig 'failed'.
func (w *Worker) reject(ctx context.Context, intent *claimedIntent, reason string) error {
	_, err := w.db.Exec(ctx,
		`update intent_inbox set status = 'failed', last_error = $1
		 where id = $2 and status = 'processing'`,
		reason, intent.ID,
	)
	w.log.Error("resolve_gap-intent verworfen", "intent", intent.ID, "err", reason)
	return err
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}
