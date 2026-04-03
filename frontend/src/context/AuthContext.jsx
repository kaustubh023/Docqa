import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/users/login/', { email, password });
            
            // Save token
            localStorage.setItem('access_token', res.data.access);
            
            // Create the user object with the Admin flag
            const userData = {
                username: res.data.username,
                is_staff: res.data.is_staff,
                email: email
            };

            // Save to storage and update state
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await axios.post('http://127.0.0.1:8000/api/users/logout/', {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
            });
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            localStorage.clear();
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};