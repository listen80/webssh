var SSH = require('ssh2').Client
// public
module.exports = function socket(socket) {
  // if websocket connection arrives without an express session, kill it
  var termCols, termRows
  if (!socket.request.session) {
    socket.emit('401 UNAUTHORIZED')
    socket.disconnect(true)
    return
  }
  var conn = new SSH()
  socket.on('connect', function() {
      console.log('socket connect')
  })
  socket.on('geometry', function socketOnGeometry(cols, rows) {
    termCols = cols
    termRows = rows
  })
  conn.on('banner', function connOnBanner(data) {
    // need to convert to cr/lf for proper formatting
    data = data.replace(/\r?\n/g, '\r\n')
    socket.emit('data', data.toString('utf-8'))
  })

  conn.on('ready', function connOnReady() {
    socket.emit('sshok', 'success')
    conn.shell({term: socket.request.session.ssh.term, cols: termCols, rows: termRows }, function connShell(err, stream) {
      if (err) {
        SSHerror('EXEC ERROR' + err)
        conn.end()
        return
      }

      var dataBuffer = ''
      socket.on('data', function socketOnData(data) {
        stream.write(data)
        // poc to log commands from client
        if (socket.request.session.ssh.serverlog.client) {
          if (data === '\r') {
            // console.log('serverlog.client: ' + socket.request.session.id + '/' + socket.id + ' host: ' + socket.request.session.ssh.host + ' command: ' + dataBuffer)
            dataBuffer = ''
          } else {
            dataBuffer = (dataBuffer) ? dataBuffer + data : data
          }
        }
      })
      socket.on('control', function socketOnControl(controlData) {
        console.log('control', controlData)
      })
      socket.on('resize', function socketOnResize(data) {
        stream.setWindow(data.rows, data.cols)
      })
      socket.on('disconnecting', function socketOnDisconnecting(reason) { 
        console.log('SOCKET DISCONNECTING: ' + reason) 
      })
      socket.on('disconnect', function socketOnDisconnect(reason) {
        SSHerror('CLIENT SOCKET DISCONNECT', reason)
        conn.end()
      })
      socket.on('error', function socketOnError(err) {
        SSHerror('SOCKET ERROR', err)
        conn.end()
      })
      stream.on('data', function streamOnData(data) { 
        socket.emit('data', data.toString('utf-8')) 
      })
      stream.on('close', function streamOnClose(code, signal) {
        console.log('STREAM CLOSE',code, signal)
        conn.end()
      })
      stream.stderr.on('data', function streamStderrOnData(data) {
        console.log('STDERR: ' + data)
      })
    })
  })
  conn.on('end', function connOnEnd(err) { 
    SSHerror('CONN END BY HOST', err) 
  })
  conn.on('close', function connOnClose(err) {
    console.log('CONN CLOSE')
  })
  conn.on('error', function connOnError(err) {
    console.log('CONN ERROR')
    SSHerror('CONN ERROR', err)
  })
  conn.on('timeout', function timeout(err) {
    console.log('timeout ERROR')
    SSHerror('timeout ERROR', err)
  })
  conn.on('keyboard-interactive', function connOnKeyboardInteractive(name, instructions, instructionsLang, prompts, finish) {
    finish([socket.request.session.userpassword])
  })
  if (socket.request.session.username && socket.request.session.userpassword && socket.request.session.ssh) {
    try {
      conn.connect({
        host: socket.request.session.ssh.host,
        port: socket.request.session.ssh.port,
        username: socket.request.session.username,
        password: socket.request.session.userpassword,
        tryKeyboard: true,
        algorithms: socket.request.session.ssh.algorithms,
        readyTimeout: socket.request.session.ssh.readyTimeout,
        keepaliveInterval: socket.request.session.ssh.keepaliveInterval,
        keepaliveCountMax: socket.request.session.ssh.keepaliveCountMax
      })
    } catch (e) {
      socket.disconnect(true)
    }
  } else {
    socket.emit('ssherror', 'miss username or userpassword or ssh-config')
    socket.disconnect(true)
  }

  function SSHerror(myFunc, err) {
    if (err) {
      console.log('WebSSH2 error')
      console.log(err)
    }
    socket.emit('ssherror', 'SSH ' + myFunc + err)
    socket.disconnect(true)
  }
}