// Package reingest nimmt geaenderte Vault-Dateien vom Python-Scanner
// (roots_reingest.py) per HTTP entgegen und schreibt sie per Upsert
// nach Supabase (vault_memories). Idempotent: gleicher content_hash
// fuehrt zu keiner Aenderung.
package reingest

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Payload struct {
	ID          string          `json:"id"`
	Title       string          `json:"title"`
	Body        string          `json:"body"`
	ContentHash string          `json:"content_hash"`
	Tags        []string        `json:"tags,omitempty"`
	Parent      string          `json:"parent,omitempty"`
	Related     []string        `json:"related,omitempty"`
	Meta        json.RawMessage `json:"meta,omitempty"`
}

type Response struct {
	Success bool   `json:"success"`
	Status  string `json:"status"`
	ID      string `json:"id"`
}

type Handler struct {
	db    *pgxpool.Pool
	log   *slog.Logger
	token string
}

func NewHandler(db *pgxpool.Pool, log *slog.Logger, token string) *Handler {
	return &Handler{db: db, log: log, token: token}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if h.token != "" {
		if r.Header.Get("Authorization") != "Bearer "+h.token {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var p Payload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, fmt.Sprintf("Ungueltiger Payload: %v", err), http.StatusBadRequest)
		return
	}

	if _, err := uuid.Parse(p.ID); err != nil {
		http.Error(w, "Ungueltige oder fehlende UUID (id)", http.StatusBadRequest)
		return
	}
	if p.Body == "" {
		http.Error(w, "body darf nicht leer sein", http.StatusBadRequest)
		return
	}
	if p.ContentHash == "" {
		http.Error(w, "content_hash darf nicht leer sein", http.StatusBadRequest)
		return
	}

	status, err := h.upsert(r.Context(), &p)
	if err != nil {
		h.log.Error("reingest-upsert fehlgeschlagen", "id", p.ID, "err", err)
		http.Error(w, fmt.Sprintf("Datenbankfehler: %v", err), http.StatusInternalServerError)
		return
	}

	h.log.Info("reingest verarbeitet", "id", p.ID, "title", p.Title, "status", status)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Success: true,
		Status:  status,
		ID:      p.ID,
	})
}

func (h *Handler) upsert(ctx context.Context, p *Payload) (string, error) {
	var metaBytes []byte
	if len(p.Meta) > 0 && string(p.Meta) != "null" {
		metaBytes = []byte(p.Meta)
	}

	tag, err := h.db.Exec(ctx, `
		INSERT INTO vault_memories
		    (id, title, body, content_hash, tags, parent, related, meta, needs_embedding, synced_at)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8, true, now())
		ON CONFLICT (id) DO UPDATE SET
		    title           = EXCLUDED.title,
		    body            = EXCLUDED.body,
		    content_hash    = EXCLUDED.content_hash,
		    tags            = EXCLUDED.tags,
		    parent          = EXCLUDED.parent,
		    related         = EXCLUDED.related,
		    meta            = EXCLUDED.meta,
		    needs_embedding = (vault_memories.content_hash IS DISTINCT FROM EXCLUDED.content_hash),
		    synced_at       = now()
		WHERE vault_memories.content_hash IS DISTINCT FROM EXCLUDED.content_hash
		   OR vault_memories.title        IS DISTINCT FROM EXCLUDED.title
		   OR vault_memories.tags         IS DISTINCT FROM EXCLUDED.tags
		   OR vault_memories.parent       IS DISTINCT FROM EXCLUDED.parent
		   OR vault_memories.related      IS DISTINCT FROM EXCLUDED.related
		   OR vault_memories.meta         IS DISTINCT FROM EXCLUDED.meta`,
		p.ID, p.Title, p.Body, p.ContentHash, p.Tags, p.Parent, p.Related, metaBytes,
	)
	if err != nil {
		return "", err
	}

	if tag.RowsAffected() == 0 {
		return "unchanged", nil
	}
	return "synced", nil
}
