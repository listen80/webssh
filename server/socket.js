var debug = require('debug')
var debugWebSSH2 = require('debug')('WebSSH2')
var SSH = require('ssh2').Client

// public
module.exports = function socket(socket) {
  // if websocket connection arrives without an express session, kill it
  var termCols, termRows
  if (!socket.request.session) {
    socket.emit('401 UNAUTHORIZED')
    debugWebSSH2('SOCKET: No Express Session / REJECTED')
    socket.disconnect(true)
    return
  }
  var conn = new SSH()
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
    // console.log('WebSSH2 Login: user=' + socket.request.session.username + ' from=' + socket.handshake.address + ' host=' + socket.request.session.ssh.host + ' port=' + socket.request.session.ssh.port + ' sessionID=' + socket.request.sessionID + '/' + socket.id + ' mrhsession=' + socket.request.session.ssh.mrhsession + ' term=' + socket.request.session.ssh.term)
    conn.shell({
      term: socket.request.session.ssh.term,
      cols: termCols,
      rows: termRows
    }, function connShell(err, stream) {
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
        switch (controlData) {
          case 'replayCredentials':
            if (socket.request.session.ssh.allowreplay) {
              stream.write(socket.request.session.userpassword + '\n')
            }
            /* falls through */
          default:
            console.log('controlData: ' + controlData)
        }
      })
      socket.on('resize', function socketOnResize(data) {
        stream.setWindow(data.rows, data.cols)
      })
      socket.on('disconnecting', function socketOnDisconnecting(reason) { debugWebSSH2('SOCKET DISCONNECTING: ' + reason) })
      socket.on('disconnect', function socketOnDisconnect(reason) {
        debugWebSSH2('SOCKET DISCONNECT: ' + reason)
        SSHerror('CLIENT SOCKET DISCONNECT', reason)
        conn.end()
        // socket.request.session.destroy()
      })
      socket.on('error', function socketOnError(err) {
        SSHerror('SOCKET ERROR', err)
        conn.end()
      })

      stream.on('data', function streamOnData(data) { socket.emit('data', data.toString('utf-8')) })
      stream.on('close', function streamOnClose(code, signal) {
        err = { message: ((code || signal) ? (((code) ? 'CODE: ' + code : '') + ((code && signal) ? ' ' : '') + ((signal) ? 'SIGNAL: ' + signal : '')) : undefined) }
        SSHerror('STREAM CLOSE', err)
        conn.end()
      })
      stream.stderr.on('data', function streamStderrOnData(data) {
        console.log('STDERR: ' + data)
      })
    })
  })

  conn.on('end', function connOnEnd(err) { SSHerror('CONN END BY HOST', err) })
  conn.on('close', function connOnClose(err) {
    console.log('CONN CLOSE')
    // SSHerror('CONN CLOSE', err)
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
    debugWebSSH2('conn.on(\'keyboard-interactive\')')
    finish([socket.request.session.userpassword])
  })
  if (socket.request.session.username && socket.request.session.userpassword && socket.request.session.ssh) {
    // console.log('hostkeys: ' + hostkeys[0].[0])
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
        keepaliveCountMax: socket.request.session.ssh.keepaliveCountMax,
        debug: debug('ssh2')
      })
    } catch (e) {
      socket.disconnect(true)
    }

  } else {
    debugWebSSH2('Attempt to connect without session.username/password or session varialbles defined, potentially previously abandoned client session. disconnecting websocket client.\r\nHandshake information: \r\n  ' + JSON.stringify(socket.handshake))

    socket.emit('ssherror', 'miss username or userpassword or ssh-config')
    // socket.request.session.destroy()
    socket.disconnect(true)
  }

  /**
   * Error handling for various events. Outputs error to client, logs to
   * server, destroys session and disconnects socket.
   * @param {string} myFunc Function calling this function
   * @param {object} err    error object or error message
   */
  function SSHerror(myFunc, err) {
    if (err) {
      console.log('WebSSH2 error' + err.stack || err)
    }
    socket.emit('ssherror', 'SSH ' + myFunc + err)
    // socket.request.session.destroy()
    socket.disconnect(true)

    debugWebSSH2('SSHerror ' + myFunc + err)
  }
}