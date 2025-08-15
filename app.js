require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { startSocketStream } = require('./socket-stream');

const app = express();

// Configure CORS to allow specific origin and credentials
app.use(cors({
	origin: 'http://localhost:5173', // Allow only this origin
	credentials: true // Allow credentials
  }))
app.use(express.json());
app.use(morgan('dev'));
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*' } });

app.use('/api', require('./routes/chart.route'));
app.use('/api/auth', require('./routes/auth.route'));
app.use('/api/accounts', require('./routes/account.route'));
app.use('/api/trade', require('./routes/trade.route'));


// startSocketStream(io);
server.listen(4000, () =>
	console.log('Server running on http://localhost:4000')
);
