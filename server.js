require('/opt/apps/globalUnexpectedErrorHandler.js');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const os = require('os');
const fs = require('fs');
const LOG_FILE = '/var/log/vm-health.log';

const app = express()
const port = process.env.PORT || 3000

app.get('/', (req, res) => {
	res.json({
		message: 'Spland server is up and running'
	})
});

function formatBytes(bytes){
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	if(bytes === 0) return '0 B';
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

const logLine = `[${new Date().toISOString()}] VM restarted or service started. Uptime: ${os.uptime()} \n`;
try{
	fs.appendFileSync(LOG_FILE, logLine);
}catch (e) {
	console.error("Failed to write log:", e.message)
}

app.get('/health', (req, res) => {
	const uptime = os.uptime();
	const load = os.loadavg();
	const totalMem = os.totalmem();
	const freeMem = os.freemem();

	res.json({
		Status: 'OK',
		Timestamp: new Date().toISOString(),
		Hostname: os.hostname(),
		Uptime_seconds: uptime,
		Load_average: load.map(v => v.toFixed(2)),
		Memory: {
			Total: formatBytes(totalMem),
			Used: formatBytes(totalMem - freeMem),
			Free: formatBytes(freeMem),
			Usage_percent: (((totalMem - freeMem) / totalMem) * 100).toFixed(2)
		},
		Platform: os.platform(),
		Release: os.release(),
		Last_reboot: fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf-8').trim().split('\n').slice(-1)[0] : 'No Log Found'
	});
})

app.use('/users', createProxyMiddleware({
	target: process.env.USER_HOST,
	changeOrigin: true
}));

app.use('/auth', createProxyMiddleware({
	target: process.env.AUTH_HOST,
	changeOrigin: true
}));

app.use('/weather', createProxyMiddleware({
	target: process.env.WEATHER_HOST,
	changeOrigin: true
}));

app.use('/chat', createProxyMiddleware({
	target: process.env.CHAT_HOST,
	changeOrigin: true
}));

app.listen(port, () => {
	console.log('Node main server running on port: ', port);
})
