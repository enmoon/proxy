const http = require('http');
const url = require('url');
const through = require('through2');

let server = new http.Server();
let port = 8084;

server.on('request', (req, res) => {
	let urlParams = url.parse(req.url),
		options = {
			protocol: 'http:',
			hostname: req.headers.host.split(':')[0],
			port: req.headers.host.split(':')[1] || 80,
			method: req.method,
			path: urlParams.path,
			headers: req.headers
		}

	delete options.headers['accept-encoding'];

	console.log(`请求方式：${options.method}，请求地址：${options.protocol}//${options.hostname}:${options.port}${options.path}`);


	let httpProxy = http.request(options, (xres) => {
		Object.keys(xres.headers).forEach(key => {
			res.setHeader(key, xres.headers[key]);
		});

		res.writeHead(xres.statusCode);

		if (/html/i.test(xres.headers['content-type'])) {

			xres.pipe(through(function (chunk, enc, callback) {
				let chunkString = chunk.toString();
				// 给html注入的alert的js代码
				let script = '<script>alert("Hello https-mitm-proxy-handbook!")</script>';

				chunkString = chunkString.replace(/(<\/head>)/ig, function (match) {
					return script + match;
				});

				this.push(chunkString);
				callback();

			})).pipe(res);
		} else {
			xres.pipe(res);
		}

	});

	httpProxy.on('error', e => {
		console.log(e);
	});

	req.pipe(httpProxy);


});

server.on('error', (e) => {
	if (e.code == 'EADDRINUSE') {
		console.error('HTTP中间人代理启动失败！！');
		console.error(`端口：${port}，已被占用。`);
	} else {
		console.error(e);
	}
});


server.listen(port, () => {
	console.log(`HTTP中间人代理启动成功，端口：${port}`);
});