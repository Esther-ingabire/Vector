import client from './client';

export const login = (data) => client.post('/auth/login/', data);

export const verifyOtp = (data) => client.post('/auth/otp/verify/', data);

export const resendOtp = (data) => client.post('/auth/otp/resend/', data);

export const setPassword = (data) => client.post('/auth/set-password/', data);

export const me = () => client.get('/auth/me/');

export const updateProfile = (data) => client.patch('/auth/me/', data);

// JWT auth is stateless — there's no server-side session to end, so logout is just
// clearing local tokens (same as the web app's `authApi.logout`). Kept as a no-op async
// function so existing call sites awaiting it don't need to change.
export const logout = async () => {};
