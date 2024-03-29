/*jslint nomen: true */
'use strict';

var settings = {
		webserverport : '7000',
		wwwroot: 'docs',
		pattern_path: 'patterns',
		sourcehtmlfile: 'source.html',
		tofile_outputpath: 'docs'
	},
	util = require('util'),
	connect = require('connect'),
	primer = function (serverResponse, tofile, tofileCallback) {
		tofile = tofile || false;

		var fs = require('fs'),
			patternFolder = './' + settings.pattern_path,
			simpleEscaper = function (text) {
				return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
			},
			outputPatterns = function (patterns) {
				fs.readFile(settings.sourcehtmlfile, 'utf-8', function (err, content) {
					if (err !== null) {
						util.puts('There was an error when trying to read file:', 'output.html');
						return;
					}

					var i,
						l,
						file;

					for (i = 0, l = patterns.length; i < l; i += 1) {
						file = patterns[i];
						content += '<div class="pattern"><div class="display">';
						content += file.content;
					    content += '</div><div class="source"><textarea rows="6" cols="30">';
					    content += simpleEscaper(file.content);
					    content += '</textarea>';
						if (!tofile) {
							content += '<p><a href="patterns/' + file.filename + '">' + file.filename + '</a></p>';
						}
						content += '</div></div>';
					}

					content += '</body></html>';

					if (tofile) {
						tofileCallback(content);
					} else {
						serverResponse.end(content);
					}
				});
			},
			handleFiles = function (files) {
				var i,
					l,
					file,
					patterns = [];

				// This was asyncronous, but we need the file names, which we can't get from the callback of 'readFile'
				for (i = 0, l = files.length; i < l; i += 1) {
					file = {
						filename : files[i]
					};

					file.content = fs.readFileSync(patternFolder + '/' + file.filename, 'utf-8');
					patterns.push(file);
				}

				outputPatterns(patterns);
			},
			beginProcess = function () {
				fs.readdir(patternFolder, function (err, contents) {
					if (err !== null && err.code === 'ENOENT') {
						util.puts('Cannot find patterns folder:', patternFolder);
						return;
					}

					var files = [],
						i,
						l;

					for (i = 0, l = contents.length; i < l; i += 1) {
						if (contents[i].substr(-5) === '.html') {
							files.push(contents[i]);
						}
					}

					handleFiles(files);
				});
			};

		beginProcess();
	},
	server = connect.createServer(
		connect.static(__dirname + '/' + settings.wwwroot),
		function (req, resp) {
			if (req.url !== '/') {
				resp.writeHead(404, {
					'Content-Length': 0,
					'Content-Type': 'text/plain'
				});
				resp.end();
				return;
			}

			primer(resp);
		}
	);

if (process.argv[2] === '--tofile') {

	primer(null, true, function (content) {
		var fs = require('fs');
		fs.writeFile('./' + settings.tofile_outputpath + '/index.html', content, 'utf-8', function () {
			util.pump(fs.createReadStream('./' + settings.wwwroot + '/css/style.css'),
				fs.createWriteStream('./' + settings.tofile_outputpath + '/global.css'));
			util.puts('Stand-alone output can now be found in "' + settings.tofile_outputpath + '/"');
		});
	});

} else {

	server.listen(settings.webserverport);
	util.puts('You can now visit http://localhost:' + settings.webserverport + '/ to see your patterns.');
	util.puts('To kill this server, just press Ctrl + C');

}
