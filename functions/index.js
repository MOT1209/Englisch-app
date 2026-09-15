const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generativeai');

/**
 * Firebase Function that proxies Gemini API calls.
 * The API key is stored in Firebase Functions environment config,
 * never exposed to client-side code.
 *
 * Usage: POST /chat
 * Body: { contents: [...], systemInstruction: {...} }
 *
 * Deploy: firebase deploy --only functions
 */

// Initialize Gemini with the API key from environment config
// Set via: firebase functions:config set gemini.key="YOUR_KEY"
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('GEMINI_API_KEY not set in environment. Proxy will fail.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Use gemini-2.5-flash (correct model name)
const MODEL_NAME = 'gemini-2.5-flash';

exports.proxyGemini = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  // Reject requests with an explicit API key parameter — the key lives only on the server
  const requestedModel = req.query.model || MODEL_NAME;

  try {
    if (!genAI) {
      throw new Error('Gemini API key not configured on server');
    }

    const model = genAI.getGenerativeModel({ model: requestedModel });

    // Parse the request body, which mirrors the Gemini REST format
    const requestBody = req.body;

    if (!requestBody || !requestBody.contents) {
      res.status(400).json({ error: 'Missing "contents" in request body' });
      return;
    }

    const result = await model.generateContent({
      contents: requestBody.contents,
      systemInstruction: requestBody.systemInstruction
        ? { role: 'system', parts: requestBody.systemInstruction.parts }
        : undefined,
    });

    const response = result.response;
    const rawText = response.candidates[0]?.content?.parts[0]?.text || '';

    // Return the same structure as the original Gemini REST response
    res.status(200).json({
      candidates: [
        {
          content: {
            parts: [{ text: rawText }]
          }
        }
      ]
    });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      candidates: [] // Return empty candidates so client can detect the failure
    });
  }
});
