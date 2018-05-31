'use strict'

require('../css/style.css')

// com func
var $ = function(q) {
    return document.querySelector(q)
}

Node.prototype.on = Node.prototype.addEventListener

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
    var user = document.title.split('@')[0]
    var path = encodeURIComponent(document.title.split(': ')[1])

    xhr.open('POST', "/file-upload/" + user + "/" + path, true);
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
        xhr.open('GET', "/get-dir/" + user + "/" + path, true);
        xhr.onload = function() {
            if (this.readyState === 4 && this.status === 200) {
                var data = JSON.parse(this.responseText || this.response)
                var html = data.dirs.map(function(file) {
                    return "<li><span url='/file-download/" + user + "/" + path + "/" + file + "'>" + file + "</span></li>"
                }).join('')
                if (html) {
                    ol.style.display = 'block'
                    ol.innerHTML = html
                }
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


submit.on('click', function(argument) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', "/", true);
    xhr.onload = function(e) {
        start()
    }
    xhr.onerror = function(e) {
        alert('error')
    }
    xhr.send();
})

function start() {
    var terminal = $('#terminal')
    var term = new Terminal({
        "cursorBlink": true,
        "scrollback": 10000,
        "tabStopWidth": 8,
        "bellStyle": "sound"
    })
    term.open(terminal, true)
    term.focus()
    term.fit()

    var socket = io.connect(null, { resource: location.pathname.replace(/[^/]*$/, '') + 'socket.io' })
    // onresize

    function resizeScreen() {
        term.fit()
        socket.emit('resize', { cols: term.cols, rows: term.rows })
    }

    function disconnect() {
        socket.emit('disconnect')
    }

    function error() {
        login.style.display = 'block'
        while(terminal.firstChild) {
            terminal.removeChild(terminal.firstChild)
        }
        window.removeEventListener('beforeunload', disconnect, false)
        window.removeEventListener('resize', resizeScreen, false)
    }

    window.addEventListener('beforeunload', disconnect, false)
    window.addEventListener('resize', resizeScreen, false)

    // io
    term.on('data', function(data) {
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
        login.style.display = 'none'
    })

    socket.on('title', function(data) {
        document.title = data
    })

    socket.on('ssherror', function(data) {
        console.error(data)
        error()
    })

    socket.on('disconnect', function(err) {
        console.log('disconnect', err)
        socket.io.reconnection(false)
        error()
    })

    socket.on('error', function(err) {
        console.log(err)
        error()
    })
}