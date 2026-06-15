import client from './client';

export const login = (data) => client.post('/auth/login/', data);

export const verifyOtp = (data) => client.post('/auth/verify-otp/', data);

export const resendOtp = (data) => client.post('/auth/resend-otp/', data);

export const setPassword = (data) => client.post('/auth/set-password/', data);

export const me = () => client.get('/auth/me/');

export const updateProfile = (data) => client.patch('/auth/me/', data);

export const logout = () => client.post('/auth/logout/');
