// Package openrouter ist ein duenner Wrapper um die OpenRouter
// Chat-Completions-API. Erfuellt heartbeat.LLM (Complete(ctx, prompt) (string, error)),
// analog zum Modellaufruf in services/api/src/services/ModelRouter.ts.
package openrouter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const apiURL = "https://openrouter.ai/api/v1/chat/completions"

type Client struct {
	apiKey     string
	model      string
	httpClient *http.Client
}

func New(apiKey, model string) *Client {
	return &Client{
		apiKey:     apiKey,
		model:      model,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// maxResponseTokens deckelt die Antwortlänge. Der Chooser erwartet nur ein
// winziges JSON-Objekt — ohne dieses Limit fordert OpenRouter je nach Modell
// einen sehr hohen Standardwert an, der bei knappem Guthaben mit HTTP 402
// abgelehnt wird, obwohl die eigentliche Antwort minimal ist.
const maxResponseTokens = 500

type chatRequest struct {
	Model     string        `json:"model"`
	Messages  []chatMessage `json:"messages"`
	MaxTokens int           `json:"max_tokens"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
}

func (c *Client) Complete(ctx context.Context, prompt string) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("OPENROUTER_API_KEY nicht gesetzt")
	}

	body, err := json.Marshal(chatRequest{
		Model:     c.model,
		Messages:  []chatMessage{{Role: "user", Content: prompt}},
		MaxTokens: maxResponseTokens,
	})
	if err != nil {
		return "", fmt.Errorf("request kodieren: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("request bauen: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("openrouter aufruf: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("antwort lesen: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("openrouter status %d: %s", resp.StatusCode, truncate(string(respBody), 300))
	}

	var parsed chatResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("antwort dekodieren: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("keine antwort im ergebnis")
	}

	return parsed.Choices[0].Message.Content, nil
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}
