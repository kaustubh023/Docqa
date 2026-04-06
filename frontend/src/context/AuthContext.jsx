import { createContext, useState, useEffect } from 'react';
import { api, authApi } from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.warn('Invalid stored user payload. Clearing local session.', error);
            localStorage.removeItem('user');
            localStorage.removeItem('access_token');
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        try {
            const res = await api.post('users/login/', { email, password });
            
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

    const register = async (username, email, password) => {
        await api.post('users/register/', {
            username,
            email,
            password,
            password2: password,
        });
    };

    const logout = async () => {
        try {
            await authApi.post('users/logout/', {});
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            localStorage.clear();
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
