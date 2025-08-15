import React, { useState } from 'react';
import api from '../utils/api';

const TradeForm = () => {
  const [side, setSide] = useState('buy');
  const [volume, setVolume] = useState(1);
  const [symbol] = useState('XAU/USD');

  const handleTrade = async () => {
    try {
        // if (!amount || amount <= 0) {
        //     toast.error("Enter a valid amount");
        //     return;
        //   }


      await api.post('/trade', { side, volume, symbol });
      alert('Trade executed!');
    } catch (err) {
      console.error(err);
      alert('Trade failed!');
    }
  };

  return (
    <div className="p-4 border rounded">
      <select value={side} onChange={(e) => setSide(e.target.value)}>
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
      </select>

      <input
        type="number"
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        placeholder="Volume"
      />

      <button onClick={handleTrade}>Execute</button>
    </div>
  );
};

export default TradeForm;
