import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/';
const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`;

// 1. Standard API (Used for Login & Register where we don't have a token yet)
export const api = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    // This is CRITICAL: It allows Django to set the HttpOnly refresh cookie in our browser
    withCredentials: true, 
});

export const buildApiUrl = (path = '') => `${baseURL}${path.replace(/^\//, '')}`;

// 2. Secure API (Used for everything else once logged in)
export const authApi = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Interceptor: Before a secure request leaves React, attach the access token
authApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let refreshPromise = null;

const refreshAccessToken = async () => {
    const response = await api.post('users/token/refresh/', {});
    const newAccessToken = response?.data?.access;

    if (!newAccessToken) {
        throw new Error('No access token returned from refresh endpoint.');
    }

    localStorage.setItem('access_token', newAccessToken);
    return newAccessToken;
};

// Interceptor: If access token expired, refresh once and retry original request.
authApi.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const isRefreshCall = originalRequest?.url?.includes('users/token/refresh/');

        if (status === 401 && originalRequest && !originalRequest._retry && !isRefreshCall) {
            originalRequest._retry = true;

            try {
                if (!refreshPromise) {
                    refreshPromise = refreshAccessToken().finally(() => {
                        refreshPromise = null;
                    });
                }

                const newAccessToken = await refreshPromise;
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                return authApi(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('access_token');
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
