'use strict'

// import * as io from 'socket.io-client'
// import * as Terminal from 'xterm/dist/xterm'
// import * as fit from 'xterm/dist/addons/fit/fit'

// require('xterm/dist/xterm.css')
require('../css/style.css')

// Terminal.applyAddon(fit)

/* global Blob, logBtn, credentialsBtn, downloadLogBtn */
var sessionLogEnable = false
var loggedData = false
var allowreplay = false
var sessionLog, sessionFooter, logDate, currentDate, myFile, errorExists, isUploading = false
var socket, termid // eslint-disable-line
var term = new Terminal()
// DOM properties
var $ = function(q) {
    return document.querySelector(q)
}

var header = $('#header')
var footer = $('#footer')
Node.prototype.on = Node.prototype.addEventListener

$('#upload').on('click', function(argument) {
    if (isUploading) {
        return
    }
    var input = document.createElement('input')
    input.type = 'file'
    input.onchange = function() {
        postfile(this.files[0])
    }
    input.click()
})

var download = $('#download')
var terminalContainer = $('#terminal-container')

$('#new').on('click', function(argument) {
    open('./')
})

function postfile(file) {
    if (!file || !file.size) {
        console.log(file)
        return
    }
    isUploading = true
    var formData = new FormData();
    formData.append('file', file);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', `/file-upload/${document.title.split('@')[0]}/${encodeURIComponent(document.title.split(': ')[1])}`, true);
    var ot = new Date().getTime();

    xhr.upload.onprogress = function(evt) {
        if (evt.lengthComputable) {
            upload.innerHTML = Math.floor(evt.loaded / evt.total * 100) + "%"
        }
    }
    xhr.onload = function(e) {
        upload.innerHTML = 'Upload'
        term.focus()
        isUploading = false
    }
    xhr.onerror = function(e) {
        isUploading = false
    }
    xhr.send(formData);
    term.focus()
}



download.on('click', function(e) {
    if (e.target === this) {
        var xhr = new XMLHttpRequest();
        var user = document.title.split('@')[0]
        var path = encodeURIComponent(document.title.split(': ')[1])
        xhr.open('GET', `/get-dir/${user}/${path}`, true);
        xhr.onload = function() {
            if (this.readyState === 4 && this.status === 200) {
                var data = JSON.parse(this.responseText || this.response)
                ol.style.display = 'block'
                ol.innerHTML = data.dirs.map(function(file) {
                    return `<li><a href='/file-download/${user}/${path}/${file}'>${file}</a></li>`
                }).join('')
            }
        }
        xhr.send()
    }
}, false)

document.on('drop', function(ev) {
    ev.preventDefault();
    postfile(ev.dataTransfer.files[0])
    term.focus()
})

document.on('dragover', function(ev) {
    ev.preventDefault();
})

document.on('click', function(ev) {
    ol.style.display = 'none'
})

function resizeScreen() {
    term.fit()
    socket.emit('resize', { cols: term.cols, rows: term.rows })
}

window.addEventListener('resize', resizeScreen, false)

if (document.location.pathname) {
    var parts = document.location.pathname.split('/')
    var base = parts.slice(0, parts.length - 1).join('/') + '/'
    var resource = base.substring(1) + 'socket.io'
    socket = io.connect(null, { resource: resource })
} else {
    socket = io.connect()
}

term.open(terminalContainer, true)
term.focus()

resizeScreen()


term.on('data', function(data) {
    // console.warn(data)
    socket.emit('data', data)
})

term.on('title', function(title) {
    document.title = title
})

socket.on('data', function(data) {
    // console.info(data)npm
    control.style.display = 'inline-block'
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
    // term.setOption('bellStyle', data.bellStyle)
})

socket.on('title', function(data) {
    document.title = data
})

socket.on('menu', function(data) {
    console.log(data)
})

socket.on('status', function(data) {
    console.log('status', data)
    // status.innerHTML = data
})

socket.on('ssherror', function(data) {
    // alert(data)
    console.error(data)
    // status.innerHTML = data
    // status.style.backgroundColor = 'red'
    errorExists = true
})

socket.on('headerBackground', function(data) {
    header.style.backgroundColor = data
})

socket.on('header', function(data) {
    if (data) {
        header.innerHTML = data
        header.style.display = 'block'
        resizeScreen()
    }
})

socket.on('footer', function(data) {
    sessionFooter = data
    footer.innerHTML = data
})

socket.on('allowreplay', function(data) {
    if (data === true) {
        // console.log('allowreplay: ' + data)
        allowreplay = true
        console.log(Credentials)
    } else {
        allowreplay = false
        // console.log('allowreplay: ' + data)
    }
})

socket.on('disconnect', function(err) {
    if (!errorExists) {
        console.log('disconnect')
        // status.style.backgroundColor = 'red'
        // status.innerHTML = 'DISCONNECTED: ' + err
    }
    socket.io.reconnection(false)
    control.style.display = 'none'
})

socket.on('error', function(err) {
    if (!errorExists) {
        console.log('error')
        // status.style.backgroundColor = 'red'
        // status.innerHTML = 'ERROR: ' + err
    }
    control.style.display = 'none'
})