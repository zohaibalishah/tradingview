import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

// Get market status
export const useGetMarketStatus = () => {
  return useQuery({
    queryKey: ['marketStatus'],
    queryFn: async () => {
      const response = await api.get('/market/status');
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Get market status with countdown
export const useGetMarketCountdown = () => {
  return useQuery({
    queryKey: ['marketCountdown'],
    queryFn: async () => {
      const response = await api.get('/market/status/countdown');
      return response.data;
    },
    refetchInterval: 1000, // Refetch every second for countdown
  });
};
