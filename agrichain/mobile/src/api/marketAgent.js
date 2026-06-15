import client from './client';

export const getMyAnalytics = () =>
  client.get('/market-agent/analytics/');

export const getNotices = (params) =>
  client.get('/market-agent/notices/', { params });

export const recordCollection = (data) =>
  client.post('/market-agent/collections/', data);

export const getCollections = (params) =>
  client.get('/market-agent/collections/', { params });

export const submitWasteReport = (data) =>
  client.post('/market-agent/waste-reports/', data);

export const getWasteReports = (params) =>
  client.get('/market-agent/waste-reports/', { params });
