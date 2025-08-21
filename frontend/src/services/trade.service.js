import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

// Get open trades
export const useGetOpenTrades = () => {
  return useQuery({
    queryKey: ['openTrades'],
    queryFn: async () => {
      const response = await api.get('/trades/open');
      return response.data;
    },
    // refetchInterval: 30000, // Refetch every 30 seconds (reduced from 5 seconds since we have real-time updates)
  });
};

// Create a new trade
export const useCreateTrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tradeData) => {
      const response = await api.post('/trades/create', tradeData);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch open trades
      queryClient.invalidateQueries({ queryKey: ['openTrades'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      return data;
    },
    onError: (error) => {
      console.error('Trade creation error:', error);
      throw error;
    },
  });
};

// Close a trade
export const useCloseTrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tradeId) => {
      const response = await api.post(`/trades/${tradeId}/close`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch open trades
      queryClient.invalidateQueries({ queryKey: ['openTrades'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
};



// Get market price data
export const useGetMarketPrice = (symbol) => {
  return useQuery({
    queryKey: ['marketPrice', symbol],
    queryFn: async () => {
      const response = await api.get(`/market-price?symbol=${symbol}`);
      return response.data;
    },
    // refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
    enabled: !!symbol, // Only run query if symbol is provided
  });
};
