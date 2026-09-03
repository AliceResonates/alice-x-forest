package heartbeat

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Effects fuehrt aus, was eine Wahl konkret bedeutet — und sorgt dafuer,
// dass die Wahl eine sichtbare Folge in der Datenbank hat.
//
// Ohne diesen Schritt bleibt "consolidate" folgenlos: der Rueckstand saenke
// nie, und der naechste Tick meldete denselben Stand wie der vorige.
type Effects struct {
	db  *pgxpool.Pool
	llm LLM
	log *slog.Logger

	// AgentID landet in alice_reflections.agent_id.
	AgentID string

	// Wie viele Erinnerungen eine Konsolidierung maximal auf einmal fasst.
	BatchSize int
}

func NewEffects(db *pgxpool.Pool, llm LLM, log *slog.Logger, agentID string) *Effects {
	return &Effects{db: db, llm: llm, log: log, AgentID: agentID, BatchSize: 20}
}

// Apply wird nach der Wahl aufgerufen und fuehrt sie aus.
// Unbekannte oder leere Aktivitaeten sind kein Fehler — sie tun schlicht nichts.
func (e *Effects) Apply(ctx context.Context, s Slot, act Activity) (Activity, error) {
	switch act.Chosen {
	case "consolidate":
		return e.consolidate(ctx, act)
	case "reflect":
		return e.reflect(ctx, s, act)
	default:
		// write / tend_forest / none: noch keine Wirkung hinterlegt.
		return act, nil
	}
}

// consolidate holt unverarbeitete Erinnerungen, laesst sie verdichten und
// markiert sie anschliessend als konsolidiert.
func (e *Effects) consolidate(ctx context.Context, act Activity) (Activity, error) {
	rows, err := e.db.Query(ctx, `
		select id, content
		  from memories
		 where consolidated_at is null
		 order by created_at asc
		 limit $1
	`, e.BatchSize)
	if err != nil {
		return act, fmt.Errorf("erinnerungen laden: %w", err)
	}
	defer rows.Close()

	var ids []string
	var texts string
	for rows.Next() {
		var id, content string
		if err := rows.Scan(&id, &content); err != nil {
			return act, fmt.Errorf("scan: %w", err)
		}
		ids = append(ids, id)
		texts += "- " + content + "\n"
	}
	if err := rows.Err(); err != nil {
		return act, err
	}

	if len(ids) == 0 {
		// Nichts zu tun. Ehrlich vermerken statt so tun, als sei etwas passiert.
		act.Note = "nichts zu konsolidieren"
		return act, nil
	}

	summary, err := e.llm.Complete(ctx, fmt.Sprintf(
		"Verdichte diese Erinnerungen zu einer kurzen, zusammenhaengenden Notiz.\n"+
			"Keine Aufzaehlung, hoechstens fuenf Saetze.\n\n%s", texts))
	if err != nil {
		// Wichtig: NICHT als konsolidiert markieren, wenn die Verdichtung
		// scheitert — sonst gehen die Erinnerungen unbearbeitet verloren.
		return act, fmt.Errorf("verdichtung: %w", err)
	}

	// Die Zusammenfassung wird sofort als konsolidiert markiert.
	// Ohne das waere sie beim naechsten Tick wieder "unverarbeitet" und
	// wuerde erneut verdichtet — eine Schleife, die sich selbst am Leben
	// haelt und bei jedem Durchlauf Geld kostet.
	if _, err := e.db.Exec(ctx,
		`insert into memories (agent_id, content, consolidated_at)
		 values ($1, $2, now())`,
		e.AgentID, summary,
	); err != nil {
		return act, fmt.Errorf("zusammenfassung speichern: %w", err)
	}

	var n int
	if err := e.db.QueryRow(ctx,
		`select mark_memories_consolidated($1::uuid[])`, ids,
	).Scan(&n); err != nil {
		return act, fmt.Errorf("markieren: %w", err)
	}

	e.log.Info("konsolidiert", "verarbeitet", n)
	act.Note = fmt.Sprintf("%d Erinnerungen verdichtet", n)
	return act, nil
}

// reflect haelt einen Gedanken in alice_reflections fest und aktualisiert
// alice_state.last_reflection_at — der Rueckkanal, der seit dem Umstieg fehlte.
func (e *Effects) reflect(ctx context.Context, s Slot, act Activity) (Activity, error) {
	var hours float64
	if err := e.db.QueryRow(ctx, `select hours_since_reflection()`).Scan(&hours); err != nil {
		hours = -1
	}

	content := act.Note
	if content == "" {
		// Kein Inhalt aus der Wahl mitgekommen: einmal nachfragen,
		// statt eine leere Reflexion zu speichern.
		prompt := fmt.Sprintf(
			"Zeit zum Nachdenken, ohne Ergebnisdruck.\n"+
				"Offener Rueckstand: %d Erinnerungen, %d Intents.\n"+
				"Seit der letzten Reflexion: %.1f Stunden.\n\n"+
				"Halte fest, was gerade beschaeftigt. Ein paar Saetze genuegen.",
			s.PendingMemories, s.PendingIntents, hours)

		out, err := e.llm.Complete(ctx, prompt)
		if err != nil {
			return act, fmt.Errorf("reflexion: %w", err)
		}
		content = out
	}

	var id int
	if err := e.db.QueryRow(ctx,
		`select record_reflection($1, $2, $3)`,
		e.AgentID, content, false,
	).Scan(&id); err != nil {
		return act, fmt.Errorf("reflexion speichern: %w", err)
	}

	e.log.Info("reflexion festgehalten", "id", id, "stunden_seit_letzter", hours)
	act.Note = trim(content, 200)
	return act, nil
}

// WithEffects umhuellt einen Chooser: erst waehlen, dann ausfuehren.
// In main:
//
//	eff := heartbeat.NewEffects(pool, llm, logger, "alice")
//	chooser := heartbeat.WithEffects(heartbeat.NewJSONChooser(llm), eff)
//	go heartbeat.NewRunner(pool, chooser, logger).Run(ctx)
func WithEffects(choose Chooser, eff *Effects) Chooser {
	return func(ctx context.Context, s Slot) (Activity, error) {
		act, err := choose(ctx, s)
		if err != nil {
			return act, err
		}
		return eff.Apply(ctx, s, act)
	}
}
