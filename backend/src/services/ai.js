export async function analyze(readings) {
  const url = process.env.AI_SERVICE_URL;
  if (!url) return { anomaly: false, riskScore: 0, reason: 'AI service not configured', available: false };
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ readings }),
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) throw new Error(`AI service returned HTTP ${response.status}`);
    const result = await response.json();
    if (typeof result.anomaly !== 'boolean' || !Number.isFinite(result.riskScore) ||
        result.riskScore < 0 || result.riskScore > 1 || typeof result.reason !== 'string') {
      throw new Error('AI service returned an invalid response schema');
    }
    return { ...result, available: true };
  } catch (error) {
    console.error(`AI analysis unavailable: ${error.message}`);
    return { anomaly: false, riskScore: 0, reason: 'AI service unavailable; temperature threshold checks still apply', available: false };
  }
}
