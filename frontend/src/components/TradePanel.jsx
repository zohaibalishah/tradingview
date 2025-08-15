// src/components/TradePanel.jsx
import { useState } from "react";
import axios from "axios";

export default function TradePanel() {
  const [side, setSide] = useState("buy");
  const [volume, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleTrade = async () => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:4000/api/trade", {
        symbol: "XAU/USD",
        side,
        volume
      });
      setMessage(`✅ ${side.toUpperCase()} executed at ${res.data.price}`);
    } catch (err) {
      setMessage("❌ Trade failed");
    }
    setLoading(false);
  };

  return (
    <div style={{ margin: "20px 0", padding: 20, background: "#111", color: "#fff" }}>
      <h2>Place Trade</h2>
      <div>
        <select value={side} onChange={(e) => setSide(e.target.value)}>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>

        <input
          type="number"
          placeholder="volume"
          value={volume}
          onChange={(e) => setAmount(+e.target.value)}
          min={1}
          style={{ marginLeft: 10 }}
        />

        <button onClick={handleTrade} disabled={loading} style={{ marginLeft: 10 }}>
          {loading ? "Processing..." : "Execute"}
        </button>
      </div>

      {message && <p style={{ marginTop: 10 }}>{message}</p>}
    </div>
  );
}
