import { VertexAI } from '@google-cloud/vertexai';
const projectId = process.env.GCP_PROJECT_ID || '';
const location = process.env.GCP_LOCATION || 'us-central1';

// Initialisiert die Verbindung zur Google Cloud unter Verwendung deines Guthabens
const vertexAI = new VertexAI({ project: projectId, location: location });

export async function callGemini(systemPrompt: string, userContent: string): Promise<string> {
  try {
    // Wir holen uns das performante Pro-Modell direkt aus deiner Cloud
    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro', 
    });

    const chatSession = generativeModel.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Verstanden. Ich kenne meine Systemparameter." }] }
      ]
    });

    const result = await chatSession.sendMessage([{ text: userContent }]);
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

  } catch (error) {
    console.error('❌ Fehler beim Vertex AI / Gemini Aufruf:', error);
    return '';
  }
}