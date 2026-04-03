import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const [documents, setDocuments] = useState([]);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // Fetch documents as soon as the dashboard loads
    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get('http://127.0.0.1:8000/api/documents/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocuments(response.data);
        } catch (error) {
            console.error("Error fetching documents:", error);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setError('');
    };

    // --- LOGOUT FUNCTION ---
    const handleLogout = () => {
        // Remove all possible token names to be perfectly safe
        localStorage.removeItem("access_token"); 
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("access"); 
        localStorage.removeItem("refresh");
        
        // Redirect to the login page
        window.location.href = "/login"; 
    };

    // --- DELETE FUNCTION ---
    const handleDelete = async (documentId) => {
        // Ask for confirmation so users don't accidentally delete files
        if (!window.confirm("Are you sure you want to delete this file?")) return;

        try {
            const token = localStorage.getItem('access_token');
            // Send the DELETE request to Django
            await axios.delete(`http://127.0.0.1:8000/api/documents/${documentId}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // If successful, instantly remove it from the React state (no need to refresh page)
            setDocuments((prevDocs) => prevDocs.filter((doc) => doc.id !== documentId));
        } catch (error) {
            console.error("Error deleting document:", error);
            alert("Failed to delete document. Ensure the server is running.");
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setError('');

        // Files MUST be sent as FormData, not standard JSON
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('access_token');
            await axios.post('http://127.0.0.1:8000/api/documents/', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data', // Critical for file uploads!
                },
            });
            
            setFile(null); // Clear the file input
            fetchDocuments(); // Refresh the list to show the new file
            
            // Reset the file input visually
            document.getElementById('file-upload').value = ""; 
        } catch (error) {
            console.error("Upload failed:", error);
            setError("Upload failed. Make sure it is a PDF, DOC, DOCX, or TXT file.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
                    <button 
                        onClick={handleLogout}
                        className="px-5 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-sm hover:bg-red-600 transition-colors"
                    >
                        Logout
                    </button>
                </div>

                {/* Upload Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-4 items-center">
                        <input 
                            id="file-upload"
                            type="file" 
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileChange}
                            className="flex-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        <button 
                            type="submit" 
                            disabled={!file || uploading}
                            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {uploading ? 'Uploading...' : 'Upload Document'}
                        </button>
                    </form>
                    {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                </div>

                {/* Documents List Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-800">Uploaded Files</h2>
                    </div>
                    
                    {documents.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No documents uploaded yet. Upload your first file above!
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {documents.map((doc) => (
                                <li key={doc.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {/* Simple Document Icon */}
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        </div>
                                        <div>
                                            {/* THE CHAT LINK LOGIC */}
                                            {doc.status === 'ready' ? (
                                                <Link to={`/chat/${doc.filename}`} className="text-sm font-bold text-blue-600 hover:underline">
                                                    {doc.filename}
                                                </Link>
                                            ) : (
                                                <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                                            )}
                                            <p className="text-xs text-gray-500">
                                                Uploaded on {new Date(doc.uploaded_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            doc.status === 'ready' ? 'bg-green-100 text-green-800' : 
                                            doc.status === 'failed' ? 'bg-red-100 text-red-800' : 
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                        </span>

                                        {/* THE NEW DELETE BUTTON WITH TRASH ICON */}
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDelete(doc.id);
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Delete File"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </div>
        </div>
    );
}