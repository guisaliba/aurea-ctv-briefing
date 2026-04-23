const {
  META_ADS_MATRIX,
  MAX_FORM_CONTEXT,
  MAX_COMBINED_PROMPT
} = require('./prompt-matrix.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string'
    ? safeParse(req.body)
    : (req.body || {});

  const accessCode = body.access_code;
  if (!accessCode || accessCode !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: 'Código de acesso inválido.' });
  }

  const formContext = body.form_context;
  if (typeof formContext !== 'string' || !formContext.trim()) {
    return res.status(400).json({ error: 'Dados do formulário inválidos.' });
  }
  if (formContext.length > MAX_FORM_CONTEXT) {
    return res.status(400).json({ error: 'Dados do formulário muito longos.' });
  }

  const userMessage =
    'Dados do formulário (use como base, nesta ordem):\n\n' +
    '<form_data>\n' +
    formContext.trim() +
    '\n</form_data>';

  if (userMessage.length > MAX_COMBINED_PROMPT) {
    return res.status(400).json({ error: 'Prompt acima do limite do servidor.' });
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
        // Five structured blocks; 4k was tight and can truncate (stop_reason max_tokens) → unparseable output.
        max_tokens: 16384,
        system: META_ADS_MATRIX,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return res.status(502).json({ error: 'Erro ao gerar copy. Tente novamente.' });
    }

    const data = await response.json();
    if (data && data.stop_reason) {
      const usage = data.usage || {};
      console.info('Anthropic generate', {
        stop_reason: data.stop_reason,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens
      });
    }
    if (data && data.stop_reason === 'max_tokens') {
      console.error(
        'Anthropic response hit max_tokens; copy may be truncated and client parsing can fail. Consider raising max_tokens or tightening output instructions.'
      );
    }
    const text = Array.isArray(data.content)
      ? data.content
          .filter((block) => block && block.type === 'text')
          .map((block) => block.text)
          .join('\n')
      : '';

    return res.status(200).json({ result: text, meta: { stop_reason: data.stop_reason } });
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
