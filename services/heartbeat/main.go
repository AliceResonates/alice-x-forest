package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/AliceResonates/alice-x-forest/services/heartbeat/heartbeat"
	"github.com/AliceResonates/alice-x-forest/services/heartbeat/openrouter"
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// buildDSN nutzt DATABASE_URL direkt, falls gesetzt (z.B. die
// Postgres-Connection-URI aus dem Supabase-Dashboard, unverändert
// eingefügt). Sonst Fallback auf dieselben DB_*-Variablennamen wie in
// services/api/src/app.ts, TLS an, außer DB_SSL=false ist gesetzt.
func buildDSN() string {
	if dsn := os.Getenv("DATABASE_URL"); dsn != "" {
		return dsn
	}

	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(getEnv("DB_USER", "axf_user"), os.Getenv("DB_PASSWORD")),
		Host:   fmt.Sprintf("%s:%s", getEnv("DB_HOST", "postgres"), getEnv("DB_PORT", "5432")),
		Path:   "/" + getEnv("DB_NAME", "axf_db"),
	}
	q := u.Query()
	if os.Getenv("DB_SSL") == "false" {
		q.Set("sslmode", "disable")
	} else {
		q.Set("sslmode", "require")
	}
	u.RawQuery = q.Encode()
	return u.String()
}

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	openrouterKey := os.Getenv("OPENROUTER_API_KEY")
	if openrouterKey == "" {
		log.Error("OPENROUTER_API_KEY nicht gesetzt")
		os.Exit(1)
	}

	model := getEnv("HEARTBEAT_MODEL", "google/gemma-3-27b-it")

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := pgxpool.New(ctx, buildDSN())
	if err != nil {
		log.Error("db-pool konnte nicht erstellt werden", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Sofort prüfen statt erst beim ersten Tick in zwei Minuten zu erfahren,
	// dass z.B. das DB-Passwort nicht stimmt.
	if err := pool.Ping(ctx); err != nil {
		log.Error("db-verbindung fehlgeschlagen", "err", err)
		os.Exit(1)
	}

	llm := openrouter.New(openrouterKey, model)
	eff := heartbeat.NewEffects(pool, llm, log, "alice")
	chooser := heartbeat.WithEffects(heartbeat.NewJSONChooserWithContext(llm, pool), eff)
	r := heartbeat.NewRunner(pool, chooser, log)

	log.Info("heartbeat service startet", "model", model)
	r.Run(ctx)
}
