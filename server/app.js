// app.js
var path = require('path')
var nodeRoot = path.dirname(require.main.filename)
var configPath = path.join(nodeRoot, 'config.json')
var publicPath = path.join(nodeRoot, 'public')
var config = require('read-config')(configPath)
var express = require('express')
var logger = require('morgan')
var session = require('express-session')({
    secret: config.session.secret,
    name: config.session.name,
    resave: true,
    saveUninitialized: false,
    unset: 'destroy'
})
var app = express()
var compression = require('compression')
var server = require('http').Server(app)
var validator = require('validator')
var io = require('socket.io')(server, { serveClient: false })
var socket = require('./socket')
var expressOptions = {
    dotfiles: 'ignore',
    etag: false,
    extensions: ['htm', 'html'],
    index: false,
    maxAge: '1s',
    redirect: false,
    setHeaders: function(res, path, stat) {
        res.set('x-timestamp', Date.now())
    }
}

// express
app.use(compression({ level: 9 }))
app.use(session)

if (config.accesslog) {
    app.use(logger('common'))
}

app.disable('x-powered-by')

// static files
app.use(express.static(publicPath, expressOptions))

app.get('/', function(req, res, next) {
    res.sendFile(path.join(publicPath, 'client.htm'))
})

app.post('/', function(req, res, next) {
    req.params.host = req.params.host || "127.0.0.1"
    req.session.username=  'root'
    req.session.userpassword = 'lijiabin'
    req.session.ssh = {
        host: (validator.isIP(req.params.host + '') && req.params.host) ||
               (validator.isFQDN(req.params.host) && req.params.host) ||
               (/^(([a-z]|[A-Z]|[0-9]|[!^(){}\-_~])+)?\w$/.test(req.params.host) && req.params.host) || config.ssh.host,

        port: (validator.isInt(req.query.port + '', { min: 1, max: 65535 }) && req.query.port) || config.ssh.port,
        algorithms: config.algorithms,
        keepaliveInterval: config.ssh.keepaliveInterval,
        keepaliveCountMax: config.ssh.keepaliveCountMax,
        term: (/^(([a-z]|[A-Z]|[0-9]|[!^(){}\-_~])+)?\w$/.test(req.query.sshterm) && req.query.sshterm) || config.ssh.term,
        mrhsession: ((validator.isAlphanumeric(req.headers.mrhsession + '') && req.headers.mrhsession) ? req.headers.mrhsession : 'none'),
        serverlog: {
            client: config.serverlog.client || false,
            server: config.serverlog.server || false
        },
        readyTimeout: (validator.isInt(req.query.readyTimeout + '', { min: 1, max: 300000 }) && req.query.readyTimeout) || config.ssh.readyTimeout
    }
    res.send('ok')
})

var fs = require('fs');

app.get('/file-download/:user/:path/:fileName', function(req, res, next) {

    var path = req.params.path
    var user = req.params.user
    var fileName = req.params.fileName
    path = decodeURIComponent(path)
    file = decodeURIComponent(fileName)
    path = path + '/' + fileName

    if (path[0] === '/') {

    } else if (path[0] === '~') {
        var config = fs.readFileSync('/etc/passwd').toString()
        var result = config.split(/\n/).some(function(v) {
            var splits = v.split(':')
            if (splits[0] === user) {
                path = path.replace('~', splits[5])
                return true
            }
        })
        if (!result) {
            res.send('error user')
            return
        }
    } else {
        res.send('error path')
    }
    var stats = fs.existsSync(path) && fs.statSync(path);
    if (stats && stats.isFile()) {
        res.set({
            'Content-Type': 'application/octet-stream',
            // 'Content-Type': 'application/x-download',
            'Content-Disposition': 'attachment; filename=' + encodeURIComponent(fileName),
            'Content-Length': stats.size
        });
        fs.createReadStream(path
            /*, {
            			encoding: 'utf8'
            		}*/
        ).pipe(res);
    } else {
        next()
    }
})

app.get('/get-dir/:user/:path', function(req, res, next) {

    var path = req.params.path
    var user = req.params.user
    path = decodeURIComponent(path)
    if (path[0] === '/') {

    } else if (path[0] === '~') {
        var config = fs.readFileSync('/etc/passwd').toString()
        var result = config.split(/\n/).some(function(v) {
            var splits = v.split(':')
            if (splits[0] === user) {
                path = path.replace('~', splits[5])
                return true
            }
        })
        if (!result) {
            res.send('error user')
            return
        }
    } else {
        res.send('error path')
    }

    var stats = fs.existsSync(path) && fs.statSync(path);
    if (stats && stats.isDirectory()) {
        var dirs = fs.readdirSync(path).filter(function(filename) {
            return fs.statSync(path + '/' + filename).isFile()
        })
        res.send(JSON.stringify({ dirs }))
    } else {
        next()
    }
})


app.post('/file-upload/:user/:path', function(req, res) {
    // 获得文件的临时路径
    var path = req.params.path
    var user = req.params.user
    path = decodeURIComponent(path)
    if (path[0] === '/') {

    } else if (path[0] === '~') {
        var config = fs.readFileSync('/etc/passwd').toString()

        var result = config.split(/\n/).some(function(v) {
            var splits = v.split(':')
            if (splits[0] === user) {
                path = path.replace('~', splits[5])
                return true
            }
        })
        if (!result) {
            res.send('error user')
            return
        }

    } else {
        res.send('error path')
    }
    var multer = require('multer')().any();
    multer(req, res, function(err) {
        if (err) {
            console.log(err);
            res.send(err)
            return;
        }
        var file = req.files[0];
        var s = file.buffer.toString()
        fs.writeFileSync(path + '/' + file.originalname, s)
        res.send(`ok and path is ${path + '/' + file.originalname}`)
    });

})

app.use(function(req, res, next) {
    console.log('sssss')
    next()
})
app.use(function(req, res, next) {
    res.status(404).send("Sorry can't find that!")
})

app.use(function(err, req, res, next) {
    console.error(err.stack)
    res.status(500).send('Something broke!')
})

// socket.io
// expose express session with socket.request.session
io.use(function(socket, next) {
    (socket.request.res) ? session(socket.request, socket.request.res, next) : next(next)
})

// bring up socket
io.on('connection', socket)

module.exports = { server: server, config: config }