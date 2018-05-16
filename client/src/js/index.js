'use strict'

import * as io from 'socket.io-client'
import * as Terminal from 'xterm/dist/xterm'
import * as fit from 'xterm/dist/addons/fit/fit'

require('xterm/dist/xterm.css')
require('../css/style.css')

Terminal.applyAddon(fit)

/* global Blob, logBtn, credentialsBtn, downloadLogBtn */
var sessionLogEnable = false
var loggedData = false
var allowreplay = false
var sessionLog, sessionFooter, logDate, currentDate, myFile, errorExists
var socket, termid // eslint-disable-line
var term = new Terminal()
// DOM properties
var status = document.getElementById('status')
var header = document.getElementById('header')
var dropupContent = document.getElementById('dropupContent')
var footer = document.getElementById('footer')
var terminalContainer = document.getElementById('terminal-container')

term.open(terminalContainer)
term.focus()
term.fit()


var upload = document.getElementById('upload')
var download = document.getElementById('download')

upload.onclick = function(argument) {
    var input = document.createElement('input')
    input.type = 'file'
    input.onchange = function() {
        postfile(this.files[0])
    }
    input.click()
}

function postfile(file) {
    // console.log(file)
    if (!file || !file.type) {
        return
    }
    var formData = new FormData();
    formData.append('file', file);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', `/file-upload/${document.title.split('@')[0]}/${encodeURIComponent(document.title.split(': ')[1])}`, true);
    var ot = new Date().getTime();
    var oloaded = 0
    xhr.upload.onprogress = function(evt) {
        console.log(this, evt)
        // event.total是需要传输的总字节，event.loaded是已经传输的字节。如果event.lengthComputable不为真，则event.total等于0
        var html = ''
        if (evt.lengthComputable) { //
            html += ( Math.round(evt.loaded / evt.total * 100) + "%");
        }
        time.innerHTML = html
    }
    xhr.onload = function(e) {
        document.getElementById("time").style.display = 'inline-block'
        document.getElementById("time").innerHTML = (xhr.responseText)
        term.focus()
        setTimeout(function(argument) {
            document.getElementById("time").style.display = 'none'
        }, 1000)
    };

    xhr.send(formData);
}
document.body.onclick = function() {
    ol.style.display = 'none'
}
download.addEventListener('click', function(e) {
    if(e.target === this) {
        var xhr = new XMLHttpRequest();
        var user = document.title.split('@')[0]
        var path = encodeURIComponent(document.title.split(': ')[1])
        xhr.open('GET', `/get-dir/${user}/${path}`, true);
        xhr.onload = function() {
            if (this.readyState === 4 && this.status === 200) {
                var data = JSON.parse(this.responseText || this.response)
                ol.style.display = 'block'
                ol.innerHTML = data.dirs.map((file) => `<li><a href='/file-download/${user}/${path}/${file}'>${file}</a></li>`).join('')

            }
        }
        xhr.send()
    }
}, false)
window.addEventListener('resize', resizeScreen, false)
document.body.addEventListener('drop', function(ev) {
    ev.preventDefault();
    postfile(ev.dataTransfer.files[0])
    term.focus()
})
document.body.addEventListener('dragover', function(ev) {
    ev.preventDefault();
})

function resizeScreen() {
    term.fit()
    socket.emit('resize', { cols: term.cols, rows: term.rows })
}

if (document.location.pathname) {
    var parts = document.location.pathname.split('/')
    var base = parts.slice(0, parts.length - 1).join('/') + '/'
    var resource = base.substring(1) + 'socket.io'
    socket = io.connect(null, {
        resource: resource
    })
} else {
    socket = io.connect()
}

term.on('data', function(data) {
    // console.warn(data)
    socket.emit('data', data)
})

socket.on('data', function(data) {
    // console.info(data)npm
    wrap.style.display = 'block'
    term.write(data)
    if (sessionLogEnable) {
        sessionLog = sessionLog + data
    }
})

socket.on('connect', function() {
    socket.emit('geometry', term.cols, term.rows)
})

socket.on('setTerminalOpts', function(data) {
    term.setOption('cursorBlink', data.cursorBlink)
    term.setOption('scrollback', data.scrollback)
    term.setOption('tabStopWidth', data.tabStopWidth)
    term.setOption('bellStyle', data.bellStyle)
})

socket.on('title', function(data) {
    document.title = data
})

socket.on('menu', function(data) {
    drawMenu(data)
})

socket.on('status', function(data) {
    status.innerHTML = data
})

socket.on('ssherror', function(data) {
    status.innerHTML = data
    status.style.backgroundColor = 'red'
    errorExists = true
})

socket.on('headerBackground', function(data) {
    header.style.backgroundColor = data
})

socket.on('header', function(data) {
    if (data) {
        header.innerHTML = data
        header.style.display = 'block'
        // terminalContainer.style.height = 'calc(100% - 38px)'
        resizeScreen()
    }
})

socket.on('footer', function(data) {
    sessionFooter = data
    footer.innerHTML = data
})

socket.on('statusBackground', function(data) {
    status.style.backgroundColor = data
})

socket.on('allowreplay', function(data) {
    if (data === true) {
        // console.log('allowreplay: ' + data)
        allowreplay = true
        drawMenu(dropupContent.innerHTML + '<a id="credentialsBtn"><i class="fas fa-key fa-fw"></i> Credentials</a>')
    } else {
        allowreplay = false
        // console.log('allowreplay: ' + data)
    }
})

socket.on('disconnect', function(err) {
    if (!errorExists) {
        status.style.backgroundColor = 'red'
        status.innerHTML =
            'WEBSOCKET SERVER DISCONNECTED: ' + err
    }
    socket.io.reconnection(false)
    wrap.style.display = 'none'
})

socket.on('error', function(err) {
    if (!errorExists) {
        status.style.backgroundColor = 'red'
        status.innerHTML = 'ERROR: ' + err
    }
    wrap.style.display = 'none'
})

term.on('title', function(title) {
    document.title = title
})

// draw/re-draw menu and reattach listeners
// when dom is changed, listeners are abandonded
function drawMenu(data) {
    dropupContent.innerHTML = data
    logBtn.addEventListener('click', toggleLog)
    allowreplay && credentialsBtn.addEventListener('click', replayCredentials)
    loggedData && downloadLogBtn.addEventListener('click', downloadLog)
}

// replay password to server, requires
function replayCredentials() { // eslint-disable-line
    socket.emit('control', 'replayCredentials')
    // console.log('replaying credentials')
    term.focus()
    return false
}

// Set variable to toggle log data from client/server to a varialble
// for later download
function toggleLog() { // eslint-disable-line
    if (sessionLogEnable === true) {
        sessionLogEnable = false
        loggedData = true
        logBtn.innerHTML = '<i class="fas fa-clipboard fa-fw"></i> Start Log'
        console.log('stopping log, ' + sessionLogEnable)
        currentDate = new Date()
        sessionLog = sessionLog + '\r\n\r\nLog End for ' + sessionFooter + ': ' +
            currentDate.getFullYear() + '/' + (currentDate.getMonth() + 1) + '/' +
            currentDate.getDate() + ' @ ' + currentDate.getHours() + ':' +
            currentDate.getMinutes() + ':' + currentDate.getSeconds() + '\r\n'
        logDate = currentDate
        term.focus()
        return false
    } else {
        sessionLogEnable = true
        loggedData = true
        logBtn.innerHTML = '<i class="fas fa-cog fa-spin fa-fw"></i> Stop Log'
        downloadLogBtn.style.color = '#000'
        downloadLogBtn.addEventListener('click', downloadLog)
        console.log('starting log, ' + sessionLogEnable)
        currentDate = new Date()
        sessionLog = 'Log Start for ' + sessionFooter + ': ' +
            currentDate.getFullYear() + '/' + (currentDate.getMonth() + 1) + '/' +
            currentDate.getDate() + ' @ ' + currentDate.getHours() + ':' +
            currentDate.getMinutes() + ':' + currentDate.getSeconds() + '\r\n\r\n'
        logDate = currentDate
        term.focus()
        return false
    }
}

// cross browser method to "download" an element to the local system
// used for our client-side logging feature
function downloadLog() { // eslint-disable-line
    if (loggedData === true) {
        myFile = 'WebSSH2-' + logDate.getFullYear() + (logDate.getMonth() + 1) +
            logDate.getDate() + '_' + logDate.getHours() + logDate.getMinutes() +
            logDate.getSeconds() + '.log'
        // regex should eliminate escape sequences from being logged.
        var blob = new Blob([sessionLog.replace(/[\u001b\u009b][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><;]/g, '')], {
            type: 'text/plain'
        })
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveBlob(blob, myFile)
        } else {
            var elem = window.document.createElement('a')
            elem.href = window.URL.createObjectURL(blob)
            elem.download = myFile
            document.body.appendChild(elem)
            elem.click()
            document.body.removeChild(elem)
        }
    }
    term.focus()
}