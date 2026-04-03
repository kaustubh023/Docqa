import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Sparkles, ShieldCheck, Laptop, Coffee } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            navigate('/');
        } catch {
            setError('Invalid email or password.');
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-0 relative overflow-hidden font-sans selection:bg-blue-100">
            
            {/* =======================================================
               LEFT SIDE: THE 3D MINIMALIST WORKSPACE (IMAGE AREA)
            ======================================================= */}
            <div className="hidden lg:flex lg:w-1/2 h-screen bg-blue-50/50 items-center justify-center p-12 relative overflow-hidden border-r border-slate-100">
                
                {/* --- Background Floating Orbs --- */}
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-3xl opacity-60"
                />

                <div className="relative z-10 w-full max-w-lg text-center flex flex-col items-center">
                    
                    {/* --- THE 3D SCENE --- */}
                    <div className="relative w-full h-80 mb-12 flex items-center justify-center">
                        
                        {/* 1. Floating Laptop (Main 3D Element) */}
                        <motion.div 
                            animate={{ y: [0, -15, 0], rotateZ: [-2, 2, -2] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute z-20"
                        >
                            <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-blue-900/10 border border-slate-100">
                                <Laptop className="w-40 h-40 text-blue-600 stroke-[1.5]" />
                            </div>
                        </motion.div>

                        {/* 2. Floating Coffee (Approachability) */}
                        <motion.div 
                            animate={{ y: [0, 10, 0], rotateZ: [5, -5, 5] }}
                            transition={{ duration: 5, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -bottom-10 -right-10 z-10"
                        >
                            <div className="bg-white p-4 rounded-full shadow-xl shadow-slate-900/5 border border-slate-100">
                                <Coffee className="w-16 h-16 text-amber-700 stroke-[1]" />
                            </div>
                        </motion.div>

                        {/* 3. The AI Sparkles (The 'Magic') */}
                        <motion.div 
                            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-16 -left-16 z-30"
                        >
                            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-300">
                                <Sparkles className="w-12 h-12 text-white" />
                            </div>
                        </motion.div>
                    </div>

                    <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                        Unlock the knowledge <br/> in your documents.
                    </h2>
                    <p className="text-slate-600 text-lg max-w-md font-medium">
                        Your friendly 3D assistant for instant document query, analysis, and data extraction.
                    </p>
                </div>
            </div>

            {/* =======================================================
               RIGHT SIDE: THE MODERN GLASS LOGIN FORM
            ======================================================= */}
            <div className="w-full lg:w-1/2 h-screen flex items-center justify-center p-6 md:p-12 xl:p-24 bg-[#f8fafc]">
                
                <motion.div 
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="w-full max-w-md"
                >
                    {/* --- MOBILE/TAB LOGO (Visible only when left side is hidden) --- */}
                    <div className="flex flex-col items-center mb-10 lg:hidden">
                        <motion.div 
                            whileHover={{ scale: 1.1 }}
                            className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-3"
                        >
                            <ShieldCheck className="text-white w-8 h-8" />
                        </motion.div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                            DocQA<span className="text-blue-600">.ai</span>
                        </h1>
                    </div>

                    {/* --- LOGIN CARD (Keeping your 'Glass' design) --- */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white p-10 md:p-12 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 relative">
                        
                        {/* Subtle Top-Right Sparkle Decor */}
                        <Sparkles className="absolute top-10 right-10 text-blue-100" size={32} />

                        <h2 className="text-3xl font-black text-slate-950 mb-3 tracking-tight">Sign In</h2>
                        <p className="text-slate-500 text-base mb-10 font-medium">Enter your credentials to access your secure vault.</p>
                        
                        {error && (
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }} 
                                className="text-sm font-bold text-red-600 bg-red-50 p-4 rounded-xl mb-8 border border-red-100 flex items-center gap-3 shadow-inner"
                            >
                               <span className="text-xl">⚠️</span> {error}
                            </motion.div>
                        )}
                        
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={22} />
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 pl-14 text-slate-900 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-base shadow-inner"
                                        placeholder="you@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={22} />
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 pl-14 text-slate-900 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-base shadow-inner"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <motion.button
                                type="submit"
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full bg-blue-600 text-white rounded-2xl py-4.5 font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 transform"
                            >
                                Sign In <LogIn size={22} />
                            </motion.button>
                        </form>

                        <div className="mt-10 text-center">
                            <p className="text-slate-500 text-base font-medium">
                                Don't have an account? {' '}
                                <Link to="/register" className="text-blue-600 font-bold hover:underline transition-all">
                                    Create a free account
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Footer text: only visible in right panel */}
                    <div className="mt-10 flex justify-center items-center gap-3 text-slate-300">
                        <ShieldCheck size={18} />
                        <span className="text-[11px] uppercase tracking-[0.2em] font-black">Multi-Vector RAG Engine</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}