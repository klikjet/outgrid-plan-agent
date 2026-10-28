// Minimal OpenAI-compatible chat client (both the Meta Model API and
// Baseten Model APIs speak this shape). No dependencies — plain fetch.

export class ModelUnavailableError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "ModelUnavailableError";
    this.cause = cause;
  }
}

export class ModelResponseError extends Error {
  constructor(message) {
    super(message);
    this.name = "ModelResponseError";
  }
}

export function parseModelJson(text) {
  if (typeof text !== "string") throw new ModelResponseError("Model returned no text");
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) t = fence[1];
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new ModelResponseError("Model output contained no JSON object");
  }
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (err) {
    throw new ModelResponseError(`Model output was not valid JSON: ${err.message}`);
  }
}

// callModel({ baseUrl, apiKey, model, system, user, timeoutMs }) -> parsed JSON
export async function callModelJson({ baseUrl, apiKey, model, system, user, timeoutMs = 90000 }) {
  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new ModelUnavailableError(`Model endpoint unreachable (${baseUrl}): ${err.message}`, err);
  }
  if (res.status >= 500 || res.status === 429) {
    throw new ModelUnavailableError(`Model endpoint returned ${res.status} (${baseUrl})`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ModelResponseError(`Model request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  return parseModelJson(content);
}
