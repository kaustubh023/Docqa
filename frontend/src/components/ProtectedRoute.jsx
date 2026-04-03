import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    if (!user) {
        // Not logged in? Redirect to login page
        return <Navigate to="/login" />;
    }

    return children;
};

export default ProtectedRoute;