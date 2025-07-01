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

  // Matrix digital rain effect
  useEffect(() => {
    const canvas = document.getElementById('matrix-bg');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charArray = chars.split('');
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#0f0';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 35);
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Courier+Prime:wght@400;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier Prime', monospace;
          background: #000;
          color: #00ff00;
          overflow-x: hidden;
        }
        
        #matrix-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -1;
          opacity: 0.1;
        }
        
        .glow {
          text-shadow: 0 0 5px #00ff00, 0 0 10px #00ff00, 0 0 15px #00ff00;
        }
        
        .matrix-border {
          border: 1px solid #00ff00;
          box-shadow: 
            0 0 5px rgba(0, 255, 0, 0.3),
            inset 0 0 5px rgba(0, 255, 0, 0.1);
        }
        
        .glitch {
          animation: glitch 0.3s linear infinite;
        }
        
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-1px, 1px); }
          40% { transform: translate(-1px, -1px); }
          60% { transform: translate(1px, 1px); }
          80% { transform: translate(1px, -1px); }
          100% { transform: translate(0); }
        }
        
        .typing-effect {
          border-right: 2px solid #00ff00;
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0%, 50% { border-color: #00ff00; }
          51%, 100% { border-color: transparent; }
        }
        
        .pulse {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 5px rgba(0, 255, 0, 0.3); }
          50% { box-shadow: 0 0 25px rgba(0, 255, 0, 0.6); }
          100% { box-shadow: 0 0 5px rgba(0, 255, 0, 0.3); }
        }
        
        .matrix-button {
          background: linear-gradient(45deg, #000, #003300);
          border: 1px solid #00ff00;
          color: #00ff00;
          padding: 12px 24px;
          font-family: 'Orbitron', monospace;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .matrix-button:hover {
          background: linear-gradient(45deg, #003300, #006600);
          box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
          transform: translateY(-2px);
        }
        
        .matrix-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .matrix-input {
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid #00ff00;
          color: #00ff00;
          padding: 12px;
          font-family: 'Courier Prime', monospace;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        
        .matrix-input:focus {
          outline: none;
          box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
          background: rgba(0, 50, 0, 0.2);
        }
        
        .matrix-input::placeholder {
          color: rgba(0, 255, 0, 0.5);
        }
        
        .scan-line {
          position: relative;
          overflow: hidden;
        }
        
        .scan-line::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.2), transparent);
          animation: scan 3s infinite;
        }
        
        @keyframes scan {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
      
      <canvas id="matrix-bg"></canvas>
      
      <div className="min-h-screen p-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="text-center mb-8 scan-line">
            <h1 className="text-6xl font-bold mb-4 glow" style={{ fontFamily: 'Orbitron, monospace' }}>
              THE MATRIX
            </h1>
            <h2 className="text-2xl mb-2 glitch" style={{ fontFamily: 'Orbitron, monospace' }}>
              PDF NEURAL INTERFACE
            </h2>
                         <p className="text-green-400 text-lg">
               {'>'} UPLOAD DOCUMENTS TO THE MAINFRAME_
             </p>
            <div className="mt-4 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
          </header>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Panel - Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* API Key */}
              <div className="matrix-border p-6 bg-black bg-opacity-50 backdrop-blur-sm pulse">
                <h3 className="text-xl font-bold mb-4 glow" style={{ fontFamily: 'Orbitron, monospace' }}>
                  SECURITY ACCESS
                </h3>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="ENTER ACCESS CODE..."
                  className="matrix-input w-full"
                />
              </div>

              {/* PDF Upload */}
              <div className="matrix-border p-6 bg-black bg-opacity-50 backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-4 glow" style={{ fontFamily: 'Orbitron, monospace' }}>
                  DATA INJECTION
                </h3>
                <div className="space-y-4">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="matrix-input w-full file:matrix-button file:border-0 file:mr-4"
                  />
                  {selectedFile && (
                    <div className="text-green-400 text-sm typing-effect">
                      {'>'} {selectedFile.name}
                    </div>
                  )}
                  <button
                    onClick={uploadPDF}
                    disabled={uploadingPDF || !selectedFile || !apiKey}
                    className="matrix-button w-full"
                  >
                    {uploadingPDF ? 'UPLOADING...' : 'INJECT DATA'}
                  </button>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="matrix-border p-6 bg-black bg-opacity-50 backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-4 glow" style={{ fontFamily: 'Orbitron, monospace' }}>
                  INTERFACE MODE
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      value="normal"
                      checked={chatMode === 'normal'}
                      onChange={(e) => setChatMode(e.target.value)}
                      className="w-4 h-4 accent-green-500"
                    />
                    <span>STANDARD NEURAL LINK</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      value="rag"
                      checked={chatMode === 'rag'}
                      onChange={(e) => setChatMode(e.target.value)}
                      className="w-4 h-4 accent-green-500"
                    />
                    <span>DOCUMENT MATRIX</span>
                  </label>
                </div>

                {chatMode === 'rag' && (
                  <div className="mt-4">
                    <select
                      value={selectedDocument}
                      onChange={(e) => setSelectedDocument(e.target.value)}
                      className="matrix-input w-full"
                    >
                      <option value="">SELECT DATA NODE...</option>
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.id.substring(0, 20)}... ({doc.chunks_count} CHUNKS)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* System Status */}
              <div className="matrix-border p-6 bg-black bg-opacity-50 backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-4 glow" style={{ fontFamily: 'Orbitron, monospace' }}>
                  SYSTEM STATUS
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>MODE:</span>
                    <span className="text-green-400">
                      {chatMode === 'rag' ? 'DOCUMENT MATRIX' : 'NEURAL LINK'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>NODES:</span>
                    <span className="text-green-400">{documents.length}</span>
                  </div>
                  {chatMode === 'rag' && selectedDocument && (
                    <div className="flex justify-between">
                      <span>ACTIVE:</span>
                      <span className="text-green-400 truncate ml-2">
                        {selectedDocument.substring(0, 15)}...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Chat Interface */}
            <div className="lg:col-span-2">
              <div className="matrix-border h-full bg-black bg-opacity-50 backdrop-blur-sm">
                {/* Chat Header */}
                <div className="p-4 border-b border-green-500">
                  <h3 className="text-xl font-bold glow" style={{ fontFamily: 'Orbitron, monospace' }}>
                    NEURAL INTERFACE TERMINAL
                  </h3>
                                     <div className="text-green-400 text-sm">
                     {'>'} {chatMode === 'rag' ? 'DOCUMENT MATRIX ACTIVE' : 'STANDARD LINK ESTABLISHED'}_
                   </div>
                </div>

                {/* Messages */}
                <div className="h-96 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '500px' }}>
                  {messages.length === 0 ? (
                    <div className="text-center text-green-400 mt-20">
                      <div className="text-6xl mb-4">●</div>
                      <div className="typing-effect">
                        {chatMode === 'rag' ? 
                          'AWAITING DOCUMENT QUERY...' : 
                          'NEURAL LINK READY...'
                        }
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded ${
                          msg.role === 'user'
                            ? 'bg-green-900 bg-opacity-30 border-l-4 border-green-500 ml-8'
                            : 'bg-black bg-opacity-30 border-l-4 border-green-400 mr-8'
                        }`}
                      >
                        <div className="font-bold mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                          {msg.role === 'user' ? '▶ USER:' : '▶ MATRIX:'}
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-green-500">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      placeholder={chatMode === 'rag' ? 
                        'QUERY DOCUMENT MATRIX...' : 
                        'ENTER NEURAL COMMAND...'
                      }
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="matrix-input flex-1"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={loading || !userMessage || (chatMode === 'rag' && !selectedDocument)}
                      className="matrix-button"
                    >
                      {loading ? 'PROCESSING...' : 'EXECUTE'}
                    </button>
                    <button
                      onClick={clearChat}
                      className="matrix-button bg-red-900 border-red-500 text-red-400 hover:bg-red-800"
                    >
                      PURGE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
