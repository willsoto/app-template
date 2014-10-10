/* global __dirname */
'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var tagVersion = require('gulp-tag-version');
var minifyCSS = require('gulp-minify-css');

var karma = require('karma').server;

var browserSync = require('browser-sync');
var reload = browserSync.reload;

var glob = require('glob');
var runSequence = require('run-sequence');

var config = {
    app: 'app',
    build: 'build',

    server: {
        port: 3000,
        url: 'http://localhost:'
    },

    html: {
        files: [
            'app/**/*.html'
        ]
    },

    js: {
        files: [
            'gulpfile.js',
            'app/**/*.js',
            '!app/bower_components/**/*.js',
            '!app/templates.js'
        ]
    },
    scss: {
        files: [
            'app/**/*.scss',
            '!app/bower_components/**/*.scss'
        ],
        src: 'app/app.scss',
        devDest: 'app/app.css',
        buildDest: 'build/app.css'
    }
};

var release = function(importance) {
    gulp.src(['./bower.json', './package.json'])
        .pipe($.bump({
            type: importance
        }))
        .pipe(gulp.dest('./'))
        .pipe($.git.commit('bumps package version'))
        .pipe($.filter('bower.json'))
        .pipe(tagVersion());
};

gulp.task('clean', function(cb) {
    require('del')([config.build], {
        force: true
    }, cb);
});

gulp.task('jshint', function() {
    return gulp.src(config.js.files)
        .pipe($.plumber())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'));
});

gulp.task('browser-sync', function() {
    browserSync({
        server: {
            baseDir: './app'
        }
    });
});

gulp.task('copy', function() {
    gulp.src(config.appDir + '**/*.html')
        .pipe(gulp.dest(config.build));
});

gulp.task('open', function() {
    var url = config.server.url + config.server.port;

    require('opn')(url);
});

gulp.task('convert', function() {
    return gulp.src(config.app + 'bower_components/**/*.css')
        .pipe($.rename({
            extname: '.copy.scss'
        }))
        .pipe(gulp.dest(config.app + 'bower_components/'));
});

gulp.task('scss-dev', function(cb) {
    gulp.src(config.scss.src)
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.sass({
            errLogToConsole: true
        }))
        .pipe($.sourcemaps.write({
            includeContent: false,
            sourceRoot: '.'
        }))
        .pipe($.sourcemaps.init({
            loadMaps: true
        }))
        .pipe($.autoprefixer())
        .pipe($.sourcemaps.write('.', {
            includeContent: false,
            sourceRoot: '.'
        }))
        .pipe(gulp.dest(config.app))
        .pipe($.filter(config.app + '/*.css'))
        .pipe(reload({
            stream: true
        }));
    cb();
});

gulp.task('scss-build', function() {
    return gulp.src(config.scss.src)
        .pipe($.sass())
        .pipe($.autoprefixer())
        .pipe($.uncss({
            html: glob.sync('app/**/*.html')
        }))
        .pipe(minifyCSS({
            keepSpecialComments: 0
        }))
        .pipe(gulp.dest(config.build));
});

gulp.task('uglify', function() {
    return gulp.src(config.build + '/app.js')
        .pipe($.uglify())
        .pipe(gulp.dest(config.build));
});

gulp.task('watch', function() {
    $.watch(config.scss.files, function(files, cb) {
        gulp.start('scss-dev', cb);
    });
});

gulp.task('requirejs', function() {
    $.requirejs({
        mainConfigFile: config.app + '/config.js',
        baseUrl: config.app,
        name: 'app',
        out: 'app.js',
        useStrict: true,
        optimizeCss: 'none',
        generateSourceMaps: false,
        optimize: 'uglify2',
        preserveLicenseComments: true
    }).pipe(gulp.dest(config.build));
});

gulp.task('test', function(done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done);
});

gulp.task('uncss', function() {
    return gulp.src(config.scss.devDest)
        .pipe($.uncss({
            html: glob.sync(config.html.files)
        }))
        .pipe(gulp.dest(config.app));
});

gulp.task('default', [
    'browser-sync',
    'scss-dev',
    'watch'
]);

gulp.task('build', function() {
    runSequence('clean', 'requirejs', 'uglify', ['scss-build']);
});

gulp.task('patch', ['build'], function() {
    return release('patch');
});

gulp.task('feature', ['build'], function() {
    return release('minor');
});

gulp.task('release', ['build'], function() {
    return release('major');
});
