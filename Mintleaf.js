/*jslint node: true, maxlen: 80 */
'use strict';
var basename = new RegExp('[^/]+$'),
    base = process.mainModule.filename.replace(basename, '');
