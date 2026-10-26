import { useState } from 'react';
import API from '../services/api.js';

const adminSampleQuestions = [
  'How many employees do we have?',
  'Who is on leave today?',
  'Who was late today?',
  'Today attendance summary',
];

const employeeSampleQuestions = [
  'How many leaves do I have left?',
  'Was I late today?',
  'How many hours did I work this week?',
];

export default function SmartHelper({ role = 'employee' }) {
  const isAdmin = ['admin', 'hr'].includes(role);
  const samples = isAdmin ? adminSampleQuestions : employeeSampleQuestions;

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: isAdmin
        ? 'Hi Admin! Ask me about employee count, who is on leave today, or who was late today.'
        : 'Hi! Ask me about your remaining leave balance, today’s check-in status, or hours worked this week.',
    },
  ]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [showLlmConfig, setShowLlmConfig] = useState(false);
  // Demo key kept only in temporary React component state (never saved or committed)
  const [demoApiKey, setDemoApiKey] = useState('');

  async function handleAsk(customQuestion) {
    const q = (customQuestion ?? question).trim();
    if (!q || busy) return;

    const userMsg = { sender: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    if (!customQuestion) setQuestion('');
    setBusy(true);

    try {
      const { data } = await API.post('/dashboard/helper', { question: q });
      let replyText = data.answer || 'No data available.';

      // Optional bonus: if user provided a temporary demo Gemini API key in the UI,
      // send the question + short summary of the real data to Gemini API via fetch()
      if (demoApiKey.trim() && data.summary) {
        try {
          const llmRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
              demoApiKey.trim()
            )}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `You are HCM Lite Smart HR Helper. Answer concisely in 1-2 sentences using ONLY this real app data summary: ${JSON.stringify(
                          data.summary
                        )}. Base answer: "${replyText}". User question: "${q}"`,
                      },
                    ],
                  },
                ],
              }),
            }
          );
          if (llmRes.ok) {
            const llmJson = await llmRes.json();
            const aiText =
              llmJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (aiText) {
              replyText = aiText;
            }
          }
        } catch {
          // Fallback to built-in keyword data answer
        }
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: replyText }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text:
            err.response?.data?.message ||
            err.message ||
            'Unable to fetch helper answer right now.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <div className="d-flex align-items-center gap-2">
          <span className="badge rounded-pill text-bg-primary">AI</span>
          <span className="fw-semibold">Smart Helper</span>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-link text-decoration-none p-0"
          onClick={() => setShowLlmConfig((s) => !s)}
        >
          {showLlmConfig ? 'Hide Demo Key' : 'Bonus LLM Key'}
        </button>
      </div>

      <div className="card-body d-flex flex-column">
        {showLlmConfig && (
          <div className="alert alert-light border small py-2 px-3 mb-3">
            <label className="form-label fw-semibold mb-1">
              Optional Gemini Demo API Key (In-Memory Only)
            </label>
            <input
              type="password"
              className="form-control form-control-sm"
              placeholder="Paste demo key (never saved or committed)"
              value={demoApiKey}
              onChange={(e) => setDemoApiKey(e.target.value)}
              autoComplete="off"
            />
            <div className="text-secondary mt-1" style={{ fontSize: '0.75rem' }}>
              Safety rule: Key stays only in temporary tab memory and is never stored or committed.
            </div>
          </div>
        )}

        <div className="d-flex flex-wrap gap-1 mb-3">
          {samples.map((s) => (
            <button
              key={s}
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={busy}
              onClick={() => handleAsk(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div
          className="border rounded p-3 mb-3 bg-light flex-grow-1 overflow-auto"
          style={{ maxHeight: 240, minHeight: 160 }}
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`d-flex mb-2 ${
                m.sender === 'user'
                  ? 'justify-content-end'
                  : 'justify-content-start'
              }`}
            >
              <div
                className={`px-3 py-2 rounded-3 small ${
                  m.sender === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-white border text-dark shadow-sm'
                }`}
                style={{ maxWidth: '85%' }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="text-secondary small fst-italic">
              Checking live HR records...
            </div>
          )}
        </div>

        <form
          className="d-flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
        >
          <input
            type="text"
            className="form-control"
            placeholder="Ask a question (e.g. Who is on leave today?)"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={busy}
          />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
