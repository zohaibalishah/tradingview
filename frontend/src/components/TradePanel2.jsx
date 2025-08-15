import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:4000"); // update with your backend URL

function TradePanel() {
  const [livePrice, setLivePrice] = useState(null);

  useEffect(() => {
    socket.on("price_update", (price) => {
      setLivePrice(price);
    });

    return () => socket.off("price_update");
  }, []);

  return (
    <div>
      <button className="buy-button">
        Buy @ {livePrice ? livePrice.toFixed(2) : "..."}
      </button>

      <button className="sell-button">
        Sell @ {livePrice ? livePrice.toFixed(2) : "..."}
      </button>
    </div>
  );
}

 export default TradePanel