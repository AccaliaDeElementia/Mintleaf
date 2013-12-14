/*jslint browser: true, maxlen:80 */
/*global jQuery, io */
(function ($) {
    'use strict';
    var socket = io.connect(document.location),
        pathsplit = new RegExp('^(.*)/([^/]+)/?'),
        busy = false,
        dir,
        parentdir,
        index,
        history = {};

    if (localStorage.Mintleaf_history) {
        try {
            history = JSON.parse(localStorage.Mintleaf_history);
        } catch (ignore) {}
    }

    function basename(path) {
        var parts = pathsplit.exec(path);
        if (!parts) { return path; }
        if (parts[2]) { return parts[2]; }
        return path;
    }

    function dirname(path) {
        var parts = pathsplit.exec(path);
        if (!parts) { return '/'; }
        if (parts[1]) { return parts[1]; }
        return '/';
    }

    function addhistory(path) {
        var dirp = dirname(path);
        history[dirp] = path;
        localStorage.Mintleaf_history = JSON.stringify(history);
        localStorage.Mintleaf_lastdir = dirp;
    }


    function getlastindex(dirp) {
        if (!history[dirp]) { return 0; }
        var idx = dir.files.indexOf(history[dirp]);
        if (idx < 0) { idx = 0; }
        return idx;
    }

    $('img.slide').on('error', function () {
        $('img.slide').attr('src', 'image/404tan.png');
    });
    function getfile(path, after) {
        var i = dir.files.indexOf(path) + 1,
            count = dir.files.length;
        if (!after) {
            after = $.noop;
        }
        $('a.name').text(basename(path));
        $('a.dirname').text(basename(dirname(path)) + ' (' + i +
            '/' + count + ')');
        socket.emit('getfile', path, function (err, data) {
            if (err) {
                data = 'image/404tan.png';
            }
            index = path;
            addhistory(path);
            $('img.slide').attr('src', data);
            after();
        });
    }

    function getdir(path, after) {
        if (!after) {
            after = $.noop;
        }
        var pattern = new RegExp('/[^/]+$'),
            parentd = path.replace(pattern, '');
        socket.emit('listdir', path, function (err, result) {
            if (err) {
                dir = null;
                getfile('');
            } else {
                dir = result;
                getfile(dir.files[getlastindex(path)]);
            }
            after();
        });
        if (parentd) {
            socket.emit('listdir', parentd, function (err, result) {
                parentdir = null;
                if (!err) {
                    parentdir = result;
                }
            });
        }
    }

    function loadingstart() {
        busy = true;
        $('.overlay.loading').show();
    }

    function loadingstop() {
        busy = false;
        $('.overlay.loading').hide();
    }

    function load(offset) {
        if (busy) { return false; }
        loadingstart();
        if (!offset || isNaN(offset)) {
            offset = 0;
        }
        var i = dir.files.indexOf(index) + offset;
        if (dir.files[i]) {
            getfile(dir.files[i], function () {
                loadingstop();
            });
            return false;
        }
        loadingstop();
        return false;
    }

    function prev() {
        return load(-1);
    }
    $('a.prev').click(prev);
    $('div.main').swiperight(prev);

    function next() {
        return load(1);
    }
    $('a.next').click(next);
    $('div.main').swipeleft(next);

    $('div.main').tap(function (tap) {
        var width = $('div.main').width();
        if (tap.clientX < width / 3) {
            prev();
        } else if (tap.clientX > 2 * width / 3) {
            next();
        }
    });

    function fetchdir(name) {
        if (busy) { return false; }
        loadingstart();
        getdir(name, function () {
            loadingstop();
        });
    }

    function loaddir(offset) {
        if (!parentdir) { return false; }
        var dirp = dirname(index),
            idx = parentdir.dirs.indexOf(dirp) + offset;
        if (parentdir.dirs[idx]) {
            fetchdir(parentdir.dirs[idx]);
        }
        return false;
    }

    function prevdir() {
        return loaddir(-1);
    }
    $('a.prevdir').click(prevdir);

    function nextdir() {
        return loaddir(1);
    }
    $('a.nextdir').click(nextdir);

    function hidedirs() {
        $('.overlay.dirs').hide();
    }
    $('.overlay.dirs').swipe(hidedirs);

    function hidefiles() {
        $('.overlay.files').hide();
    }
    $('.overlay.files').swipe(hidefiles);

    function showfiles() {
        hidedirs();
        $('.overlay.files').show();
        var base = $('<div><a href="#"></a></div>'),
            overlay = $('.overlay.files > div'),
            rows = Math.floor(overlay.height() /
                overlay.find('> div').height()) - 1,
            ct = 0,
            builder = $('<div></div>');
        $('.filelist').html('');
        dir.files.forEach(function (val) {
            var target = base.clone();
            ct += 1;
            target.find('a').click(function () {
                index = val;
                hidefiles();
                return load(0);
            }).text(basename(val));
            if (val === index) {
                target.addClass('current');
            }
            builder.append(target);
            if (ct >= rows) {
                $('.filelist').append(builder);
                builder = $('<div></div>');
                ct = 0;
            }
        });
        $('.filelist').append(builder);
    }
    $('a.name').click(showfiles);
    $('header').swipedown(showfiles);

    function showdirs() {
        hidefiles();
        $('.overlay.dirs').show();
        var base = $('<div><a href="#"></a></div>'),
            overlay = $('.overlay.dirs > div'),
            rows = Math.floor(overlay.height() /
                overlay.find('> div').height()) - 1,
            ct = 0,
            builder = $('<div></div>');
        $('.dirlist').html('');
        dir.dirs.forEach(function (val) {
            var target = base.clone();
            ct += 1;
            target.find('a').click(function () {
                index = val + '/.';
                hidedirs();
                return fetchdir(val);
            }).text(basename(val));
            if (val === dirname(index)) {
                target.addClass('current');
            }
            builder.append(target);
            if (ct >= rows) {
                $('.dirlist').append(builder);
                builder = $('<div></div>');
                ct = 0;
            }
        });
        $('.dirlist').append(builder);
    }
    $('a.dirname').click(showdirs);
    $('footer').swipeup(showdirs);
    $('.parentdir a').click(function () {
        hidedirs();
        index = dirname(index);
        fetchdir(dirname(index));
        return false;
    });

    if (window.location.hash) {
        getdir(window.location.hash.slice(1));
        window.location.hash = '';
    } else if (localStorage.Mintleaf_lastdir) {
        getdir(localStorage.Mintleaf_lastdir);
    }
    window.Mintleaf = {
        getdir: getdir,
        getfile: getfile,
        next: next,
        prev: next
    };
}(jQuery));
