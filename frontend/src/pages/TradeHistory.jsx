import TradeHistory from '../components/TradeHistory';

export default function Trade() {
  return (
    <div style={{ display: 'flex', padding: 20 }}>
      <div style={{ flex: 3 }}>
        <TradeHistory />
      </div>
    </div>
  );
}
