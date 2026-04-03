import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DocumentChat from './pages/DocumentChat'; // <-- Import it here
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/admin-panel" element={<AdminDashboard />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        
        {/* <-- Add the new dynamic Chat Route! */}
        <Route path="/chat/:filename" element={<ProtectedRoute><DocumentChat /></ProtectedRoute>} /> 
      </Routes>
    </Router>
  );
}

export default App;