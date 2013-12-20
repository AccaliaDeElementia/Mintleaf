#!/usr/bin/env python3
from flask import Flask, jsonify, make_response, send_file
import mimetypes
import os
import re

app = Flask(__name__)
prefix = '/storage/accalia/images/'
mimetypes.init()
tokenize = re.compile(r'(\d+)|(\D+)').findall

def exception_protect(func):
    def inner(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            print(repr(e))
            raise
    inner.__name__ = func.__name__
    return inner

def ensure_dir_exists(func):
    """returns 404 if first argument is not a directory

    Uses global path prefix
    """
    def inner(*args, **kwargs):
        path = ''
        if 'path' in kwargs:
            path = kwargs['path']
        elif len(args) > 0:
            path = args[0]
        if not os.path.isdir(prefix+path):
            return make_response((
                'Requested Directory Does Not Exist\n',
                404,
                []
            ))
        return func(*args, **kwargs)
    inner.__name__ = func.__name__
    return inner


def ensure_file_exists(func):
    """returns 404 if first argument is not a directory

    Uses global path prefix
    """
    def inner(*args, **kwargs):
        path = ''
        if 'path' in kwargs:
            path = kwargs['path']
        elif len(args) > 0:
            path = args[0]
        if not os.path.isfile(prefix+path):
            return make_response((
                'Requested File Does Not Exist\n',
                404,
                []
            ))
        return func(*args, **kwargs)
    inner.__name__ = func.__name__
    return inner


def sortit(collection, getkey):
    def getkeystr(item):
        return tuple(num if num else alpha for num, alpha in
            tokenize(getkey(item)))
    return sorted(collection, key=getkeystr)

@app.route('/<path:path>', methods=['GET'])
def static_get(path):
    return send_file('static/' + path,
        add_etags = True,
        conditional = True,
        cache_timeout = 60*60*24*6)

@app.route('/listdir/', methods=['GET'])
@app.route('/listdir/<path:path>/', methods=['GET'])
@exception_protect
@ensure_dir_exists
def listdir_get (path=''):
    retval = {
        'dirs': [],
        'files': []
    }
    base = prefix+path
    for item in sortit(os.listdir(base), lambda x: x.lower()):
        safepath = path + '/' + item
        filename = base + '/' + item
        if os.path.isdir(filename):
            retval['dirs'].append(safepath)
        else:
            types = mimetypes.guess_type(filename)
            if types[0] and types[0].startswith('image/'):
                retval['files'].append(safepath)
    return jsonify(retval)

@app.route('/image/<path:path>', methods=['GET','HEAD'])
@exception_protect
@ensure_file_exists
def image_get(path):
    return send_file(prefix+path, 
        add_etags=True, 
        conditional=True, 
        cache_timeout = 60*60*24*6)

if __name__ == '__main__':
    app.run('0.0.0.0')
