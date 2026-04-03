/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from 'react';
import { api, authApi } from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if the user is already logged in when the app loads
    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    // Use the secure API to get the user's profile
                    const response = await authApi.get('users/me/');
                    setUser(response.data);
                } catch (error) {
                    console.error("Token invalid or expired", error);
                    localStorage.removeItem('access_token');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        fetchUser();
    }, []);

    const login = async (email, password) => {
        // Changed 'username' to 'email' here
        const response = await api.post('users/login/', { email: email, password: password });
        
        localStorage.setItem('access_token', response.data.access);
        setUser(response.data.user);
        return response.data;
    };

    const register = async (username, email, password) => {
        // We send the password twice to satisfy Django's 'password2' requirement
        const response = await api.post('users/register/', { 
            username: username, 
            email: email, 
            password: password,
            password2: password // <-- Added this line!
        });
        return response.data;
    };

    const logout = async () => {
        try {
            // Tell the backend to blacklist the refresh token
            await authApi.post('users/logout/');
        } catch (error) {
            console.error("Logout error", error);
        } finally {
            // Wipe the local data regardless of backend response
            localStorage.removeItem('access_token');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
