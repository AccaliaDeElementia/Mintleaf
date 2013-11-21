/*jslint node:true */
'use strict';
var fs = require('fs'),
    es = require('event-stream'),
    sqlite3 = require('sqlite3'),
    async = require('async'),
    root,
    pathSplitter = new RegExp('^(.+)?/([^/]+)(/)?$'),
    db = new sqlite3.Database('test.db'),
    i = 0,
    ids = {};


function insertDir(dir, callback) {
    delete dir.$isDir;
    db.run('INSERT INTO dirs (' +
        '  id,' +
        '  parent,' +
        '  name,' +
        '  path,' +
        '  realpath' +
        ') VALUES (' +
        '  $id,' +
        '  $parent,' +
        '  $name,' +
        '  $path,' +
        '  $realpath' +
        ')', dir, function (err) {
            if (err) {
                console.log(dir);
                return callback(err);
            }
            callback();
        });
}

function insertFile(file, callback) {
    delete file.$isDir;
    db.run('INSERT INTO files (' +
        '  id,' +
        '  parent,' +
        '  name,' +
        '  path,' +
        '  realpath' +
        ') VALUES (' +
        '  $id,' +
        '  $parent,' +
        '  $name,' +
        '  $path,' +
        '  $realpath' +
        ')', file, function (err) {
            if (err) {
                console.log(file);
                return callback(err);
            }
            callback();
        });
}

async.parallel([
    function (cb) {
        db.run('SELECT 1 FROM dirs;', function (err) {
            if (!err) {
                return cb();
            }
            db.run('CREATE TABLE dirs (' +
                '  id INT PRIMARY KEY,' +
                '  parent INT NULL,' +
                '  name VARCHAR(255),' +
                '  path VARCHAR(4096),' +
                '  realpath VARCHAR(4096)' +
                ');', cb);
        });
    },
    function (cb) {
        db.run('SELECT 1 FROM files;', function (err) {
            if (!err) {
                return cb();
            }
            db.run('CREATE TABLE files (' +
                '  id INT PRIMARY KEY,' +
                '  parent INT,' +
                '  name VARCHAR(255),' +
                '  path VARCHAR(4096),' +
                '  realpath VARCHAR(4096)' +
                ');', cb);
        });
    }
], function (err) {
    if (err) {
        console.error(err);
        return;
    }
    es.pipeline(
        fs.createReadStream('files.txt'),
        es.split(),
        es.map(function (line, cb) {
            if (!line) {
                return cb();
            }
            var obj = {}, parts;
            obj.$realpath = line;
            i += 1;
            obj.$id = i;
            if (!root) {
                root = obj;
                obj.$path = '/';
                obj.$parent = 0;
                obj.$name = '/';
                obj.$isDir = true;
            } else {
                line = line.substring(root.$realpath.length);
                parts = pathSplitter.exec(line);
                obj.$path = line;
                obj.$parent = ids[!!parts[1] ? parts[1] : '/'];
                obj.$name = parts[2];
                obj.$isDir = !!parts[3];
            }
            ids[obj.$path] = obj.$id;
            cb(null, obj);
        }),
        es.map(function (obj, cb) {
            function after() {
                if (obj.$id % 100 === 0) {
                    console.log(obj.$path);
                }
                cb.call(arguments);
            }
            if (obj.$isDir) {
                insertDir(obj, after);
            } else {
                insertFile(obj, after);
            }
        })
    );
});
