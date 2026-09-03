package heartbeat

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Slot ist ein bereitgestelltes Zeitfenster. Er trägt Kontext, keine Vorschrift.
type Slot struct {
	ID              string
	TickAt          time.Time
	PendingMemories int
	PendingIntents  int
}

// Activity ist das Ergebnis einer Wahl. Chosen == "" bedeutet: nichts gewählt,
// das ist ein gültiger Ausgang und kein Fehler.
type Activity struct {
	Chosen string // z.B. "consolidate", "reflect", "write", "tend_forest"
	Note   string // optional: was dabei entstand
}

// Chooser bekommt den Slot und entscheidet, was in dieser Zeit passiert.
// Hier hängt später der Modellaufruf dran. Ein leeres Activity{} ist erlaubt.
type Chooser func(ctx context.Context, s Slot) (Activity, error)

type Runner struct {
	db     *pgxpool.Pool
	choose Chooser
	log    *slog.Logger

	// Poll-Intervall. Kürzer als der Cron-Takt (15 Min), damit ein Slot
	// zügig aufgegriffen wird, aber ohne die DB zu belästigen.
	Interval time.Duration

	// Zeitbudget für eine einzelne Wahl.
	Timeout time.Duration
}

func NewRunner(db *pgxpool.Pool, choose Chooser, log *slog.Logger) *Runner {
	return &Runner{
		db:       db,
		choose:   choose,
		log:      log,
		Interval: 2 * time.Minute,
		Timeout:  4 * time.Minute,
	}
}

// Run läuft, bis der Context abgebrochen wird. In main als Goroutine starten:
//
//	r := heartbeat.NewRunner(pool, myChooser, logger)
//	go r.Run(ctx)
func (r *Runner) Run(ctx context.Context) {
	ticker := time.NewTicker(r.Interval)
	defer ticker.Stop()

	r.log.Info("heartbeat runner gestartet", "interval", r.Interval)

	for {
		select {
		case <-ctx.Done():
			r.log.Info("heartbeat runner beendet")
			return
		case <-ticker.C:
			if err := r.processOne(ctx); err != nil {
				// Fehler beenden den Runner nie — beim nächsten Tick neuer Versuch.
				r.log.Error("heartbeat-durchlauf fehlgeschlagen", "err", err)
			}
		}
	}
}

func (r *Runner) processOne(ctx context.Context) error {
	slot, err := r.claim(ctx)
	if err != nil {
		return fmt.Errorf("claim: %w", err)
	}
	if slot == nil {
		return nil // kein offener Slot — völlig normal
	}

	r.log.Info("slot aufgegriffen",
		"slot", slot.ID,
		"pending_memories", slot.PendingMemories,
		"pending_intents", slot.PendingIntents)

	chooseCtx, cancel := context.WithTimeout(ctx, r.Timeout)
	defer cancel()

	act, err := r.choose(chooseCtx, *slot)
	if err != nil {
		// Wahl gescheitert: als 'error' markieren, nicht als 'skipped'.
		// 'skipped' bedeutet "hat sich entschieden, nichts zu tun" — ein
		// API-Ausfall ist keine Entscheidung und darf die Auswertung
		// nicht verfälschen.
		r.complete(context.WithoutCancel(ctx), slot.ID, "", err.Error(), "error")
		return fmt.Errorf("chooser: %w", err)
	}

	status := "used"
	if act.Chosen == "" {
		status = "skipped" // bewusst nichts gewählt — ein gültiges Ergebnis
	}

	if err := r.complete(ctx, slot.ID, act.Chosen, act.Note, status); err != nil {
		return fmt.Errorf("complete: %w", err)
	}

	r.log.Info("slot abgeschlossen", "slot", slot.ID, "status", status, "activity", act.Chosen)
	return nil
}

func (r *Runner) claim(ctx context.Context) (*Slot, error) {
	var s Slot
	err := r.db.QueryRow(ctx, `
		select id, tick_at, pending_memories, pending_intents
		  from claim_heartbeat_slot()
		 where id is not null
	`).Scan(&s.ID, &s.TickAt, &s.PendingMemories, &s.PendingIntents)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Runner) complete(ctx context.Context, slotID, activity, note, status string) error {
	_, err := r.db.Exec(ctx, `
		select complete_heartbeat_slot($1, $2, $3, $4)
	`, slotID, nullIfEmpty(activity), nullIfEmpty(note), status)
	return err
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
