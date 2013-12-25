/*jslint browser: true, maxlen:80 */
/*global jQuery, encodeURIComponent, decodeURIComponent*/
(function ($) {
    'use strict';

    var pathsplit = new RegExp('^(.*)/([^/]+)/?'),
        directory, //Current dir object
        parentdir, //parent dir object
        path, // Current folder path
        index, // 0 based index into current directory
        doLoadDir, //Resolve circular function reference
        history = {}; // History object

    if (localStorage.MintleafPy_history) {
        try {
            history = JSON.parse(localStorage.MintleafPy_history);
        } catch (ignore) {}
    }

    function getLastIndex() {
        if (!history[path]) {  return 0; }
        var idx = directory.files.indexOf(history[path]);
        if (idx < 0) { idx = -idx - 1; }
        return idx;
    }

    function basename(path) {
        var parts = pathsplit.exec(path);
        if (parts && parts[2]) { return parts[2]; }
        return path;
    }

    function dirname(path) {
        var parts = pathsplit.exec(path);
        if (parts && parts[1]) { return parts[1]; }
        return '/';
    }

    function setLastIndex(file) {
        var pwd = dirname(file) + '/';
        history[pwd] = file;
        localStorage.MintleafPy_history = JSON.stringify(history);
        localStorage.MintleafPy_lastdir = path;
    }

    function getdir(path, oncomplete) {
        $.getJSON('/listdir' + path, oncomplete);
    }

    $('#page').on('error', function () {
        $('#HeaderTitle,title').text('Mintleaf Image Viewer');
        $('#FooterTitle').text('Image Not Found or Corrupt');
        $('#page').attr('src', '404tan.png');
    }).on('load', function () {
        $.mobile.loading('hide');
    });

    function fillList(targetDiv, items, onClick) {
        var keys = {}, key, part, master, builder;
        master = $('<div data-role="collapsible"><h3></h3>' +
            '<ul data-role="listview"></ul></div>');
        items.forEach(function (item) {
            key = basename(item).toUpperCase()[0];
            if (key < 'A') {
                key = '-';
            } else if (key > 'Z') {
                key = '-';
            }
            if (!keys[key]) {
                keys[key] = [];
            }
            keys[key].push(item);
        });
        function itemBuilder(item) {
            var link = $('<li><a href="#" data-dest="' +
                encodeURIComponent(item) + '">' +
                basename(item) + '</a></li>');
            link.find('a').click(onClick);
            builder.append(link);
        }
        for (key in keys) {
            if (keys.hasOwnProperty(key)) {
                part = master.clone();
                part.find('h3').text(key);
                builder = part.find('ul');
                keys[key].forEach(itemBuilder);
                targetDiv.append(part);
            }
        }
        targetDiv.find('ul').listview();
        targetDiv.find('div').collapsible();
        targetDiv.collapsibleset('refresh');
    }

    function doLoadFile(item) {
        var target = decodeURIComponent($(this).jqmData('dest')),
            i,
            count,
            name,
            dir;
        if (item && typeof item === 'string') {
            target = item;
        }
        i = directory.files.indexOf(target) + 1;
        count = directory.files.length;
        name = basename(target);
        dir = basename(dirname(target));
        if (!target || target === path || target === 'undefined') {
            return;
        }
        setLastIndex(target);
        index = i - 1;
        $('#HeaderTitle,title').text(name);
        $('#FooterTitle').text(dir + ' (' + i + '/' + count + ')');
        $('#page').attr('src', '/image' + target);
        $.mobile.loading('show', {
            'textVisible': true,
            'theme': 'm'
        });
        try {
            $('#navpanel').panel('close');
        } catch (ignore) {}
    }

    function loadFiles() {
        var files = $('#FileContainer');
        files.empty();
        fillList(files, directory.files, doLoadFile);
        $('#navpanel').trigger('updatelayout');
    }

    function loadDirs() {
        var dirs = $('#DirContainer');
        dirs.empty();
        fillList(dirs, directory.dirs, doLoadDir);
        $('#navpanel').trigger('updatelayout');
    }
    function loadParent() {
        var dirs = $('#ParentContainer');
        dirs.empty();
        fillList(dirs, parentdir.dirs, doLoadDir);
        $('#navpanel').trigger('updatelayout');
    }

    doLoadDir = function realDoLoadDir(item) {
        var target = decodeURIComponent($(this).jqmData('dest'));
        if (item && typeof item === 'string') {
            target = item;
        }
        $.mobile.loading('show', {
            'textVisible': true,
            'theme': 'm'
        });
        path = target;
        getdir(target, function (dir) {
            directory = dir;
            if (dirname(path) !== '/') {
                dir.dirs.unshift('..');
                getdir(dirname(path), function (dir) {
                    parentdir = dir;
                    loadParent();
                });
            }
            loadFiles();
            loadDirs();
            $.mobile.loading('hide');
            doLoadFile(dir.files[getLastIndex()]);
        });
        try {
            $('#navpanel').panel('close');
        } catch (ignore) {}
    };

    path = localStorage.MintleafPy_lastdir;
    if (!path) {
        path = '/';
    }
    doLoadDir(path);

    function nextPage() {
        var i = index + 1;
        if (directory.files[i]) {
            doLoadFile(directory.files[i]);
        }
    }
    $('#NextPage').click(nextPage);//.tap(nextPage);

    function prevPage() {
        var i = index - 1;
        if (directory.files[i]) {
            doLoadFile(directory.files[i]);
        }
    }
    $('#PrevPage').click(prevPage);

    $("#main div:jqmData(role='content')").tap(function (tap) {
        var width = $(this).width();
        if (tap.clientX < width / 3) {
            prevPage();
        } else if (tap.clientX > 2 * width / 3) {
            nextPage();
        }
    });

    function nextFolder() {
        if (!parentdir) { return; } 
        var i = parentdir.dirs.indexOf(path) + 1;
        if (parentdir.dirs[i]) {
            doLoadDir(parentdir.dirs[i]);
        }
    }
    $('#NextFolder').click(nextFolder);

    function prevFolder() {
        if (!parentdir) { return; }
        var i = parentdir.dirs.indexOf(path) - 1;
        if (parentdir.dirs[i]) {
            doLoadDir(parentdir.dirs[i]);
        }
    }
    $('#PrevFolder').click(prevFolder);

    $("#main div:jqmData(role='content')").swipeleft(function () {
        $('#navpanel').panel('open');
    });
}(jQuery));
