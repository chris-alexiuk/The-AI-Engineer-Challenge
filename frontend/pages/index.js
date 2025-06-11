import { useState } from 'react';

export default function Home() {
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const sendMessage = async () => {
    if (!userMessage) return;

    // add the user's message and a placeholder assistant message
    setMessages([...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: '' }]);
    setUserMessage('');
    setLoading(true);

    const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        developer_message: 'You are a helpful assistant.',
        user_message: userMessage,
        model: 'gpt-4.1-mini',
        api_key: apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY
      })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let assistantMessage = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      assistantMessage += decoder.decode(value);
      setMessages(prev => {
        const updated = [...prev];
        // update the last message (assistant)
        updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
        return updated;
      });
    }

    setLoading(false);
  };

  return (
    <>
      <header>Matrix Chat</header>
      <main>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="OpenAI API Key"
        />
        <div style={{ marginBottom: '1rem' }}>
          {messages.map((msg, idx) => (
            <p key={idx}><strong>{msg.role}:</strong> {msg.content}</p>
          ))}
        </div>
        <input
          type="text"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="Ask the Matrix..."
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </main>
    </>
  );
}
