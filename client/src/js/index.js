'use strict'

require('../css/style.css')

// com func
var $ = function(q) {
    return document.querySelector(q)
}

Node.prototype.on = Node.prototype.addEventListener


// socket
var socket = null
if (document.location.pathname) {
    var parts = document.location.pathname.split('/')
    var base = parts.slice(0, parts.length - 1).join('/') + '/'
    var resource = base.substring(1) + 'socket.io'
    socket = io.connect(null, { resource: resource })
} else {
    socket = io.connect()
}

// term
var term = new Terminal()
term.open($('#terminal'), true)
term.focus()



// new 按钮
$('#new').on('click', function(argument) {
    open('./')
})

// 上传
var isUploading = false

function postfile(file) {
    if (isUploading) {
        return
    }
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

document.on('drop', function(ev) {
    ev.preventDefault();
    postfile(ev.dataTransfer.files[0])
    term.focus()
})

document.on('dragover', function(ev) {
    ev.preventDefault();
})

$('#upload').on('click', function(argument) {
    var input = document.createElement('input')
    input.type = 'file'
    input.onchange = function() {
        postfile(this.files[0])
    }
    input.click()
})

// 下载
$('#download').on('click', function(e) {
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
                    return `<li><span url='/file-download/${user}/${path}/${file}'>${file}</span></li>`
                }).join('')
            }
        }
        xhr.send()
    }
}, false)

ol.onclick = function(e) {
    var target = e.target
    if (target.nodeName === 'SPAN') {
        var a = document.createElement('a')
        a.href = target.getAttribute('url')
        a.download = ''
        a.click()
    }
}

document.on('click', function(ev) {
    ol.style.display = 'none'
})


// onresize
function resizeScreen() {
    term.fit()
    socket.emit('resize', { cols: term.cols, rows: term.rows })
}

window.addEventListener('resize', resizeScreen, false)
window.addEventListener('beforeunload', function() { socket.emit('disconnect') }, false)

resizeScreen()

// io
term.on('data', function(data) {
    // console.warn(data)
    socket.emit('data', data)
})

term.on('title', function(title) {
    document.title = title
})

socket.on('data', function(data) {
    term.write(data)
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
})

socket.on('ssherror', function(data) {
    console.error(data)
})

socket.on('headerBackground', function(data) {
    console.log('headerBackground', data)
})

socket.on('allowreplay', function(data) {
    console.log('allowreplay: ' + data)
})

socket.on('disconnect', function(err) {
    console.log('disconnect', err)
    socket.io.reconnection(false)
})

socket.on('error', function(err) {
    console.log(err)
})