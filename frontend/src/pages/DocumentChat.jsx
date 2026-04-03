import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api/axios';

export default function DocumentChat() {
    const { filename } = useParams();
    const navigate = useNavigate();

    const [messages, setMessages] = useState([
        { role: 'ai', text: `Hi! I've read "${filename}". What would you like to know about it?` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

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
            <div className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-gray-500 hover:text-blue-600 transition-colors">
                        {'<-'} Back to Dashboard
                    </button>
                    <h1 className="text-xl font-bold text-gray-800 truncate max-w-md">{filename}</h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-2xl px-5 py-4 rounded-2xl ${
                                msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm'
                            }`}
                        >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-none border shadow-sm text-gray-500 flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white border-t p-4">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your document..."
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
