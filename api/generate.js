module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string'
    ? safeParse(req.body)
    : (req.body || {});

  const accessCode = body.access_code;
  const prompt = body.prompt;

  if (!accessCode || accessCode !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: 'Código de acesso inválido.' });
  }

  if (!prompt || typeof prompt !== 'string' || prompt.length > 5000) {
    return res.status(400).json({ error: 'Prompt inválido.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY environment variable');
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return res.status(502).json({ error: 'Erro ao gerar copy. Tente novamente.' });
    }

    const data = await response.json();
    const text = Array.isArray(data.content)
      ? data.content
          .filter((block) => block && block.type === 'text')
          .map((block) => block.text)
          .join('\n')
      : '';

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}
