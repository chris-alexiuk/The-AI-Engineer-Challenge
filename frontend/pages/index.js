import { useState, useEffect } from 'react';

export default function Home() {
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [chatMode, setChatMode] = useState('normal'); // 'normal' or 'rag'
  const [selectedDocument, setSelectedDocument] = useState('');
  const [documents, setDocuments] = useState([]);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const res = await fetch(`${base}/api/documents`);
      const data = await res.json();
      setDocuments(data.documents);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a PDF file');
    }
  };

  const uploadPDF = async () => {
    if (!selectedFile || !apiKey) {
      alert('Please select a PDF file and enter your API key');
      return;
    }

    setUploadingPDF(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('api_key', apiKey);

      const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const res = await fetch(`${base}/api/upload-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        alert(`PDF uploaded successfully! Document ID: ${data.document_id}`);
        setSelectedFile(null);
        await loadDocuments(); // Reload documents list
      } else {
        const error = await res.json();
        alert(`Error uploading PDF: ${error.detail}`);
      }
    } catch (error) {
      alert(`Error uploading PDF: ${error.message}`);
    } finally {
      setUploadingPDF(false);
    }
  };

  const sendMessage = async () => {
    if (!userMessage) return;

    // Validate inputs based on chat mode
    if (chatMode === 'rag' && !selectedDocument) {
      alert('Please select a document for RAG chat');
      return;
    }

    // Add the user's message and a placeholder assistant message
    setMessages([...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: '' }]);
    setUserMessage('');
    setLoading(true);

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      let endpoint, body;

      if (chatMode === 'rag') {
        endpoint = `${base}/api/rag-chat`;
        body = JSON.stringify({
          user_message: userMessage,
          document_id: selectedDocument,
          model: 'gpt-4o-mini',
          api_key: apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY
        });
      } else {
        endpoint = `${base}/api/chat`;
        body = JSON.stringify({
          user_message: userMessage,
          model: 'gpt-4o-mini',
          api_key: apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY
        });
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
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
          // Update the last message (assistant)
          updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
          return updated;
        });
      }
    } catch (error) {
      alert(`Error sending message: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>PDF RAG Chat System</h1>
        <p style={{ color: '#666' }}>Upload PDFs and chat with your documents using AI</p>
      </header>

      <main>
        {/* API Key Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            OpenAI API Key:
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your OpenAI API Key"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>

        {/* PDF Upload Section */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '20px', 
          border: '2px dashed #ddd', 
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
          <h3 style={{ marginTop: '0', marginBottom: '15px' }}>Upload PDF Document</h3>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              style={{ marginBottom: '10px' }}
            />
            {selectedFile && (
              <p style={{ margin: '5px 0', color: '#666' }}>
                Selected: {selectedFile.name}
              </p>
            )}
          </div>
          <button
            onClick={uploadPDF}
            disabled={uploadingPDF || !selectedFile || !apiKey}
            style={{
              padding: '10px 20px',
              backgroundColor: uploadingPDF ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: uploadingPDF ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {uploadingPDF ? 'Uploading...' : 'Upload PDF'}
          </button>
        </div>

        {/* Chat Mode Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Chat Mode:
          </label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="radio"
                value="normal"
                checked={chatMode === 'normal'}
                onChange={(e) => setChatMode(e.target.value)}
                style={{ marginRight: '5px' }}
              />
              Normal Chat
            </label>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="radio"
                value="rag"
                checked={chatMode === 'rag'}
                onChange={(e) => setChatMode(e.target.value)}
                style={{ marginRight: '5px' }}
              />
              Document Chat (RAG)
            </label>
          </div>

          {/* Document Selection (only show in RAG mode) */}
          {chatMode === 'rag' && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Select Document:
              </label>
              <select
                value={selectedDocument}
                onChange={(e) => setSelectedDocument(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              >
                <option value="">Select a document...</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.id} ({doc.chunks_count} chunks)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div style={{ 
          marginBottom: '20px', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          height: '400px',
          overflowY: 'auto',
          padding: '15px',
          backgroundColor: '#f8f9fa'
        }}>
          {messages.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', marginTop: '50px' }}>
              {chatMode === 'rag' ? 
                'Select a document and start chatting about it!' : 
                'Start a conversation!'
              }
            </p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={{ 
                marginBottom: '15px', 
                padding: '10px',
                backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                borderRadius: '8px',
                borderLeft: `4px solid ${msg.role === 'user' ? '#2196f3' : '#4caf50'}`
              }}>
                <strong style={{ 
                  color: msg.role === 'user' ? '#1976d2' : '#388e3c',
                  textTransform: 'capitalize'
                }}>
                  {msg.role}:
                </strong>
                <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder={chatMode === 'rag' ? 
              'Ask a question about the selected document...' : 
              'Type your message...'
            }
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !userMessage || (chatMode === 'rag' && !selectedDocument)}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
          <button
            onClick={clearChat}
            style={{
              padding: '12px 24px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Clear
          </button>
        </div>

        {/* Status Information */}
        <div style={{ fontSize: '14px', color: '#666' }}>
          <p>
            Mode: <strong>{chatMode === 'rag' ? 'Document Chat' : 'Normal Chat'}</strong>
            {chatMode === 'rag' && selectedDocument && (
              <span> | Document: <strong>{selectedDocument}</strong></span>
            )}
          </p>
          <p>Documents available: {documents.length}</p>
        </div>
      </main>
    </div>
  );
}
