'use strict'

import * as io from 'socket.io-client'
import * as Terminal from 'xterm/dist/xterm'
import * as fit from 'xterm/dist/addons/fit/fit'
// fontawesome, individual icon imports reduces file size dramatically but it's
// a little messy. this should be fixed by some updates with the fa library at some point
// import fontawesome from '@fortawesome/fontawesome'
// import faBars from '@fortawesome/fontawesome-free-solid/faBars'
// // import faQuestion from '@fortawesome/fontawesome-free-solid/faQuestion'
// import faClipboard from '@fortawesome/fontawesome-free-solid/faClipboard'
// import faDownload from '@fortawesome/fontawesome-free-solid/faDownload'
// import faKey from '@fortawesome/fontawesome-free-solid/faKey'
// import faCog from '@fortawesome/fontawesome-free-solid/faCog'
// fontawesome.library.add(faBars, faClipboard, faDownload, faKey, faCog)

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
    console.log(file)
    if(!file) {
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
        // var progressBar = document.getElementById("progressBar");
        // var percentageDiv = document.getElementById("percentage");
        // event.total是需要传输的总字节，event.loaded是已经传输的字节。如果event.lengthComputable不为真，则event.total等于0
        // var html = ''
        // if (evt.lengthComputable) { //
        //     // progressBar.max = evt.total;
        //     // progressBar.value = evt.loaded;
        //     html += ( Math.round(evt.loaded / evt.total * 100) + "%");
        // }

        // var time = document.getElementById("time");
        // var nt = new Date().getTime(); //获取当前时间
        // var pertime = (nt - ot) / 1000; //计算出上次调用该方法时到现在的时间差，单位为s
        // ot = new Date().getTime(); //重新赋值时间，用于下次计算

        // var perload = evt.loaded - oloaded; //计算该分段上传的文件大小，单位b       
        // oloaded = evt.loaded; //重新赋值已上传文件大小，用以下次计算

        // //上传速度计算
        // var speed = perload / pertime; //单位b/s
        // var bspeed = speed;
        // var units = 'b/s'; //单位名称
        // if (speed / 1024 > 1) {
        //     speed = speed / 1024;
        //     units = 'k/s';
        // }
        // if (speed / 1024 > 1) {
        //     speed = speed / 1024;
        //     units = 'M/s';
        // }
        // speed = speed.toFixed(1);
        // //剩余时间
        // var resttime = ((evt.total - evt.loaded) / bspeed).toFixed(1);
        // time.innerHTML = html + '，速度：' + speed + units + '，剩余时间：' + resttime + 's';
        // if (bspeed == 0)
        //     time.innerHTML = '上传已取消';
    }
    xhr.onload = function(e) { 
        document.getElementById("time").style.display = 'block'
        document.getElementById("time").innerHTML = (xhr.responseText)
        term.focus()
        setTimeout(function (argument) {
            document.getElementById("time").style.display = 'none'
        }, 1500)
    };

    xhr.send(formData);
}



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
    console.warn(data)
    socket.emit('data', data)
})

socket.on('data', function(data) {
    console.info(data)
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
        // header is 19px and footer is 19px, recaculate new terminal-container and resize
        terminalContainer.style.height = 'calc(100% - 38px)'
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
        console.log('allowreplay: ' + data)
        allowreplay = true
        drawMenu(dropupContent.innerHTML + '<a id="credentialsBtn"><i class="fas fa-key fa-fw"></i> Credentials</a>')
    } else {
        allowreplay = false
        console.log('allowreplay: ' + data)
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
    console.log('replaying credentials')
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