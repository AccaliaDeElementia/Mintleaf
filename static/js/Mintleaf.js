/*jslint browser: true, maxlen:80 */
/*global jQuery, io */
(function ($) {
    'use strict';

    var pathsplit = new RegExp('^(.*)/([^/]+)/?');

    function basename(path) {
        var parts = pathsplit.exec(path);
        if (parts && parts[2]) { return parts[2]; }
        return path;
    }

    function getdir(path, oncomplete) {
        $.getJSON('/listdir' + path, oncomplete);
    }
    getdir('/imgur', function (dir) {
        var files = $('#FileContainer');
        files.empty();
        dir.files.forEach(function (item) {
            files.append('<li>' + basename(item) + '</li>');
        });
        $('#FileContainer').listview('refresh');
        $('#filelist').trigger('updatelayout');
    });
}(jQuery));
