from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
model = SentenceTransformer('all-MiniLM-L6-v2')

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'axf-embeddings'})

@app.route('/embed', methods=['POST'])
def embed():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'text fehlt'}), 400
    embedding = model.encode(text).tolist()
    return jsonify({'embedding': embedding, 'dimension': len(embedding)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
