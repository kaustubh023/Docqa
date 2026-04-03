import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api/axios';

// --- MARKDOWN IMPORTS ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function DocumentChat() {
    const { filename } = useParams();
    const navigate = useNavigate();

    const [messages, setMessages] = useState([
        { role: 'ai', text: `Hi! I've read "${filename}". What would you like to know about it?` }
    ]);
    
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await authApi.get(`documents/chat/?filename=${encodeURIComponent(filename)}`);

                // Load persisted chat history into the UI.
                if (response.data && response.data.length > 0) {
                    const normalizedMessages = response.data.map((msg) => ({
                        role: msg.role || msg.sender || 'ai',
                        text: msg.text || '',
                    }));
                    setMessages(normalizedMessages);
                }
            } catch (error) {
                console.error("Failed to load chat history", error);
            }
        };

        fetchHistory();
    }, [filename]); 

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to the bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const response = await authApi.post('documents/chat/', {
                question: userMsg,
                filename,
            });

            setMessages((prev) => [...prev, { role: 'ai', text: response.data.answer }]);
        } catch (error) {
            console.error('Chat error:', error);

            const status = error.response?.status;
            const backendError = error.response?.data?.error || error.response?.data?.detail;

            let message = 'Sorry, I encountered an unexpected error while answering your question.';
            if (status === 401) {
                message = 'Your session has expired. Please log in again.';
            } else if (backendError) {
                message = backendError;
            }

            setMessages((prev) => [...prev, { role: 'ai', text: message }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <div className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-gray-500 font-semibold hover:text-blue-600 transition-colors">
                        {'<-'} Back to Dashboard
                    </button>
                    <h1 className="text-xl font-bold text-gray-800 truncate max-w-md">{filename}</h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-2xl px-5 py-4 rounded-2xl overflow-x-auto ${
                                msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm'
                            }`}
                        >
                            {/* --- THIS IS THE MAGIC MARKDOWN BLOCK --- */}
                            {msg.role === 'user' ? (
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                            ) : (
                                <div className="prose prose-sm md:prose-base max-w-none text-gray-800">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                            )}
                            {/* ---------------------------------------- */}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-none border shadow-sm text-gray-500 flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce"></div>
                            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t p-4 z-10">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your document..."
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
