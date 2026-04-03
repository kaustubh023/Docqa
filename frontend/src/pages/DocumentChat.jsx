import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Bot, User, Loader2, Sparkles } from 'lucide-react';

export default function DocumentChat() {
    const { filename } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        { role: 'ai', text: `Hi! I've analyzed **${filename}**. Ask me anything about its contents!` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(`http://127.0.0.1:8000/api/documents/chat/?filename=${filename}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data && response.data.length > 0) {
                    setMessages(response.data);
                }
            } catch (error) {
                console.error("Failed to load chat history", error);
            }
        };
        fetchHistory();
    }, [filename]);

    useEffect(() => {
        scrollToBottom();
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
            setMessages((prev) => [...prev, { role: 'ai', text: "Sorry, I hit a snag processing that. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#f8fafc]">
            {/* --- TOP BAR (FIXED TAGS HERE) --- */}
            <motion.header 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10"
            >
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-blue-600">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Sparkles size={18} className="text-blue-500" />
                            {filename}
                        </h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">AI Document Assistant</p>
                    </div>
                </div>
            </motion.header> {/* Corrected from </nav> to </motion.header> */}

            {/* --- CHAT AREA --- */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {messages.map((msg, index) => (
                        <motion.div 
                            key={index}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-3`}
                        >
                            {msg.role === 'ai' && (
                                <div className="hidden md:flex w-8 h-8 bg-blue-600 rounded-lg items-center justify-center text-white shadow-lg shadow-blue-100 flex-shrink-0">
                                    <Bot size={18} />
                                </div>
                            )}

                            <div className={`max-w-[85%] md:max-w-2xl px-6 py-4 rounded-3xl shadow-sm ${
                                msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none shadow-blue-200'
                                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                            }`}>
                                {msg.role === 'user' ? (
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                ) : (
                                    <div className="prose prose-sm md:prose-base max-w-none prose-slate prose-p:leading-relaxed prose-strong:text-blue-600">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>

                            {msg.role === 'user' && (
                                <div className="hidden md:flex w-8 h-8 bg-slate-800 rounded-lg items-center justify-center text-white shadow-lg flex-shrink-0">
                                    <User size={18} />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <Loader2 size={18} className="animate-spin" />
                        </div>
                        <div className="bg-white px-6 py-4 rounded-3xl rounded-bl-none border border-slate-100 shadow-sm text-slate-400 text-sm font-medium italic">
                            Analyzing document...
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* --- INPUT AREA --- */}
            <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 md:p-6">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="w-full bg-slate-100 border-none rounded-2xl pl-6 pr-16 py-4 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                        disabled={loading}
                    />
                    <motion.button
                        type="submit"
                        disabled={loading || !input.trim()}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-300 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center"
                    >
                        <Send size={18} />
                    </motion.button>
                </form>
                <p className="text-center text-[10px] text-slate-400 mt-3 font-medium uppercase tracking-widest">
                    Powered by DocQA Advanced AI Pipeline
                </p>
            </div>
        </div>
    );
}