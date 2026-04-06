import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, FileStack, Zap, ArrowLeft, Activity } from 'lucide-react';
import { authApi } from '../api/axios';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await authApi.get('documents/admin-stats/');
                setStats(res.data);
            } catch (err) {
                setError("Access Restricted.");
            }
        };
        fetchStats();
    }, []);

    if (error) return <div className="h-screen flex items-center justify-center font-bold text-red-500 uppercase tracking-widest">{error}</div>;
    if (!stats) return <div className="h-screen flex items-center justify-center text-slate-400 italic">Accessing encrypted stats...</div>;

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-8 selection:bg-indigo-500">
            <div className="max-w-6xl mx-auto">
                {/* --- HEADER --- */}
                <div className="flex justify-between items-center mb-12">
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                        <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
                           <Activity className="text-indigo-500" /> Command Center
                        </h1>
                        <p className="text-slate-400 font-medium">Global system health and user analytics.</p>
                    </motion.div>
                    <Link to="/">
                        <motion.button whileHover={{ x: -5 }} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} /> Back to App
                        </motion.button>
                    </Link>
                </div>

                {/* --- STAT GRID --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {[
                        { label: 'Total Users', val: stats.total_users, icon: <Users />, color: 'from-blue-600 to-cyan-500' },
                        { label: 'Total Files', val: stats.total_documents, icon: <FileStack />, color: 'from-indigo-600 to-purple-500' },
                        { label: 'AI Responses', val: stats.total_messages, icon: <Zap />, color: 'from-orange-600 to-amber-500' }
                    ].map((item, i) => (
                        <motion.div 
                            key={i}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-1 rounded-3xl bg-gradient-to-br ${item.color} shadow-2xl`}
                        >
                            <div className="bg-[#1e293b] rounded-[22px] p-8 h-full flex flex-col justify-between">
                                <div className="text-slate-400 mb-4">{item.icon}</div>
                                <div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter mb-1">{item.label}</p>
                                    <p className="text-5xl font-black tracking-tight">{item.val}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* --- TABLE --- */}
                <motion.div 
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-[#1e293b] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden"
                >
                    <div className="p-6 border-b border-slate-800 bg-slate-800/30 font-bold flex items-center gap-2">
                        <Activity size={18} className="text-indigo-400" /> Recent System Activity
                    </div>
                    <div className="overflow-x-auto text-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-slate-500 uppercase text-[10px] tracking-widest font-black">
                                    <th className="p-6">Filename</th>
                                    <th className="p-6">Owner</th>
                                    <th className="p-6 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recent_documents.map((doc, i) => (
                                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/20 transition-colors">
                                        <td className="p-6 font-bold text-slate-200">{doc.filename}</td>
                                        <td className="p-6 text-slate-400">{doc.user}</td>
                                        <td className="p-6 text-right">
                                            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-black uppercase">
                                                {doc.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
