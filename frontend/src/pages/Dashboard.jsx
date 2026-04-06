import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../api/axios';
import {
    FileText,
    MessageSquare,
    RotateCw,
    ShieldCheck,
    Trash2,
    LogOut,
} from 'lucide-react';

export default function Dashboard() {
    const { user, logout } = useContext(AuthContext);
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    const fetchFiles = async () => {
        try {
            const res = await authApi.get('documents/');
            setFiles(res.data);
        } catch (err) {
            if (err.response?.status === 401) logout();
        }
    };

    useEffect(() => { fetchFiles(); }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;
        setUploading(true);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('filename', selectedFile.name);

        try {
            await authApi.post('documents/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });
            setSelectedFile(null);
            fetchFiles();
            alert("Success!");
        } catch (err) {
            if (err.response?.status === 401) {
                alert("Session expired. Re-logging...");
                logout();
            } else {
                alert("Upload failed. Try refreshing the page.");
            }
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete document?")) return;
        try {
            await authApi.delete(`documents/${id}/`);
            fetchFiles();
        } catch (err) {
            alert("Delete failed.");
        }
    };

    const handleReprocess = async (id) => {
        try {
            await authApi.post(`documents/${id}/reprocess/`, {});
            fetchFiles();
            alert("Reprocessing started.");
        } catch (err) {
            const message = err?.response?.data?.error || "Failed to start reprocessing.";
            alert(message);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 font-black text-xl">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><FileText /></div>
                        DocQA.ai
                    </div>
                    <div className="flex items-center gap-3">
                        {user?.is_staff && (
                            <Link to="/admin-panel" className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><ShieldCheck size={18}/> Admin</Link>
                        )}
                        <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500"><LogOut size={22}/></button>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-12">
                <header className="mb-12">
                    <h2 className="text-5xl font-black mb-4">Welcome back, <span className="text-blue-600 uppercase">{user?.username}</span></h2>
                    <p className="text-slate-500 text-lg">Upload your File and talk to your data.</p>
                </header>

                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 mb-12">
                    <form onSubmit={handleUpload} className="flex gap-6 items-center">
                        <input type="file" id="file-upload" onChange={(e) => setSelectedFile(e.target.files[0])} className="hidden" />
                        <label htmlFor="file-upload" className="flex-1 p-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 text-center text-slate-600">
                            {selectedFile ? selectedFile.name : 'Select file...'}
                        </label>
                        <button type="submit" disabled={uploading || !selectedFile} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold disabled:bg-slate-300">
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </form>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {files.map((file) => (
                        <div key={file.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg flex flex-col justify-between h-48">
                            <div>
                                <div className="flex justify-between mb-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><FileText size={24} /></div>
                                    <button onClick={() => handleDelete(file.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                                </div>
                                <h3 className="font-bold truncate">{file.filename}</h3>
                                <span className="text-[10px] font-black uppercase text-blue-500">{file.status}</span>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                                <button
                                    onClick={() => navigate(`/chat/${file.filename}`)}
                                    disabled={file.status !== 'ready'}
                                    className={`font-bold text-sm flex items-center gap-2 ${
                                        file.status === 'ready'
                                            ? 'text-blue-600'
                                            : 'text-slate-400 cursor-not-allowed'
                                    }`}
                                    title={file.status === 'ready' ? 'Start Chat' : 'Document is not ready'}
                                >
                                    Start Chat <MessageSquare size={16}/>
                                </button>

                                {file.status === 'failed' && (
                                    <button
                                        onClick={() => handleReprocess(file.id)}
                                        className="text-amber-600 font-bold text-sm flex items-center gap-2"
                                    >
                                        Retry <RotateCw size={14}/>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
