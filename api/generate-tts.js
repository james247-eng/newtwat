const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

// Get available API key with quota
async function getAvailableApiKey() {
  const keysSnapshot = await db.collection('api_keys')
    .where('active', '==', true)
    .where('usage', '<', 10000)
    .orderBy('usage', 'asc')
    .limit(1)
    .get();

  if (keysSnapshot.empty) {
    throw new Error('No available API keys with remaining quota');
  }

  const keyDoc = keysSnapshot.docs[0];
  return {
    id: keyDoc.id,
    key: keyDoc.data().key,
    usage: keyDoc.data().usage
  };
}

// Update API key usage
async function updateKeyUsage(keyId, charactersUsed) {
  await db.collection('api_keys').doc(keyId).update({
    usage: admin.firestore.FieldValue.increment(charactersUsed),
    last_used: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Main handler
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voiceId, settings, userId } = req.body;

    // Validation
    if (!text || !voiceId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }

    // Get available API key
    const apiKeyData = await getAvailableApiKey();

    // Call ElevenLabs API
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: settings || {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': apiKeyData.key,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Update usage
    await updateKeyUsage(apiKeyData.id, text.length);

    // Convert audio to base64
    const audioBase64 = Buffer.from(response.data).toString('base64');

    return res.status(200).json({
      success: true,
      audioBase64: audioBase64,
      charactersUsed: text.length
    });

  } catch (error) {
    console.error('TTS Generation Error:', error.message);
    
    if (error.message.includes('No available API keys')) {
      return res.status(503).json({ error: 'All API keys exhausted. Add more keys or wait for quota reset.' });
    }

    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};