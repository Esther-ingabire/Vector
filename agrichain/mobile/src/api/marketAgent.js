import client from './client';

export const getMyAnalytics = () =>
  client.get('/market-agents/agents/my-analytics/');

export const getNotices = (params) =>
  client.get('/market-agents/notices/', { params });

export const recordCollection = (data) =>
  client.post('/market-agents/collections/', data);

export const getCollections = (params) =>
  client.get('/market-agents/collections/', { params });

export const submitWasteReport = (data) =>
  client.post('/market-agents/waste-reports/', data);

export const getWasteReports = (params) =>
  client.get('/market-agents/waste-reports/', { params });

export const getMyOrders = (params) =>
  client.get('/distribution/orders/', { params });
