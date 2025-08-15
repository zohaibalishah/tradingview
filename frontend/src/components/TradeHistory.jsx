// src/components/TradeHistory.jsx
import { useEffect, useState } from 'react';
import api from '../services/api';
export default function TradeHistory() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = 1; 

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(`/api/trade/history?userId=${userId}`);
        const tradeArr = Array.isArray(res.data.trades) ? res.data.trades : [];
        setTrades(tradeArr);
      } catch (err) {
        console.error(err.message);
        setTrades([]);
      }
      setLoading(false);
    };

    fetchTrades();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>📜 Trade History</h2>
      {loading ? (
        <p>Loading...</p>
      ) : trades.length === 0 ? (
        <p>No trades yet.</p>
      ) : (
        <table
          style={{
            width: '100%',
            background: '#111',
            color: '#fff',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Symbol</th>
              <th style={th}>Side</th>
              <th style={th}>Volume</th>
              <th style={th}>Open Price</th>
              <th style={th}>Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id}>
                <td style={td}>{trade.id}</td>
                <td style={td}>{trade.symbol}</td>
                <td style={td}>{trade.side?.toUpperCase?.() || ''}</td>
                <td style={td}>{trade.volume ?? trade.volume}</td>
                <td style={td}>{Number(trade.openPrice).toFixed(2)}</td>
                <td style={td}>
                  {trade.createdAt
                    ? new Date(trade.createdAt).toLocaleString()
                    : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = {
  border: '1px solid #444',
  padding: '8px',
};

const td = {
  border: '1px solid #444',
  padding: '8px',
  textAlign: 'center',
};
