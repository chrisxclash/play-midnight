/*global require */
(function(){
	'use strict';

	var gulp = require('gulp'),
		Merge = require('streamqueue'),
		argv = require('yargs').argv,
		del = require('del'),
		$ = require('gulp-load-plugins')({
			rename: {
				'gulp-sass': 'sass',
				'gulp-minify-css': 'minifycss'
			},
			lazy: false
		});

	gulp.task('clean', function() {
		return del('../Dist/Chrome', {
			force: true
		});
	});

	gulp.task('dist', function() {
		// CSS
		gulp.src('src/scss/*.scss')
			.pipe($.sass({ outputStyle: 'compressed', errLogToConsole: true }))
			.pipe($.autoprefixer({ browsers: ['last 2 version'] }))
			.pipe($.minifycss())
			.pipe(gulp.dest('../Dist/Chrome/dist/css'));

		// JS
		var libs = gulp.src(['src/js/play-midnight-*', '!src/js/play-midnight-browser.js', '!src/js/play-midnight-utils.js', '!src/js/play-midnight-core.js', '!src/js/play-midnight.js']),
			browser = gulp.src('src/js/play-midnight-browser.js'),
			utils = gulp.src('src/js/play-midnight-utils.js'),
			core = gulp.src('src/js/play-midnight-core.js'),
			script = gulp.src('src/js/play-midnight.js'),
			merged;

		merged = new Merge({ objectMode: true });
		merged.queue(browser);
		merged.queue(utils);
		merged.queue(core);
		merged.queue(libs);
		merged.queue(script);

		merged.done()
			.pipe($.eslint())
			.pipe($.eslint.format())
			.pipe($.concat('play-midnight.js'))
			.pipe($.uglify())
			.pipe(gulp.dest('../Dist/Chrome/dist/js'));

		// Background JS
		gulp.src(['src/js/**/*.js', '!src/js/play-midnight*'])
			.pipe($.eslint())
			.pipe($.eslint.format())
			.pipe($.uglify())
			.pipe(gulp.dest('../Dist/Chrome/dist/js'));

		// Other
		gulp.src(['src/**/*.html', 'src/**/*.json', 'src/**/*.{png,ico,jpg,gif}'])
			.pipe(gulp.dest('../Dist/Chrome/dist'));

		return gulp.src(['manifest.json', '*.png'])
			.pipe(gulp.dest('../Dist/Chrome'))
			.pipe($.notify({ onLast: true, message: 'Build Task Completed' }));
	});

	gulp.task('copy', function() {
		return gulp.src(['src/**/*.json', 'src/**/*.js', '!src/**/play-midnight*'])
			.pipe(gulp.dest('dist'));
	});

	/* Combine Sass / Libraries */
	gulp.task('styles', function() {
		var style = gulp.src('src/scss/*.scss');

		return style
			.pipe($.sass({ outputStyle: 'compressed', errLogToConsole: true }))
			.pipe($.autoprefixer({ browsers: ['last 2 version'] }))
			.pipe($.if(argv.prod, $.minifycss()))
			.pipe(gulp.dest('dist/css'))
			.pipe($.notify({ onLast: true, message: 'Styles Task Completed' }));
	});

	/* Main Script / Libraries */
	gulp.task('scripts', function() {
		var libs = gulp.src(['src/js/play-midnight-*', '!src/js/play-midnight-browser.js', '!src/js/play-midnight-utils.js', '!src/js/play-midnight-core.js', '!src/js/play-midnight.js']),
			browser = gulp.src('src/js/play-midnight-browser.js'),
			utils = gulp.src('src/js/play-midnight-utils.js'),
			core = gulp.src('src/js/play-midnight-core.js'),
			script = gulp.src('src/js/play-midnight.js'),
			merged;

		merged = new Merge({ objectMode: true });
		merged.queue(browser);
		merged.queue(utils);
		merged.queue(core);
		merged.queue(libs);
		merged.queue(script);

		return merged.done()
			.pipe($.eslint())
			.pipe($.eslint.format())
			.pipe($.concat('play-midnight.js'))
			.pipe($.if(argv.prod, $.uglify()))
			.pipe(gulp.dest('dist/js'))
			.pipe($.notify({ onLast: true, message: 'Main Scripts Task Completed' }));
	});

	/* Images Script */
	gulp.task('images', function() {
		var images = gulp.src('src/images/**/*');

		return images
		.pipe(gulp.dest('dist/images'))
		.pipe($.notify({ onLast: true, message: 'Images Task Completed' }));
	});

	/* HTML Script */
	gulp.task('html', function() {
		var html = gulp.src('src/**/*.html');

		return html
			.pipe(gulp.dest('dist'))
			.pipe($.notify({ onLast: true, message: 'HTML Task Completed' }));
	});

	/* Watch File Changes */
	gulp.task('watch', function() {
		gulp.watch('src/scss/**/*.scss', ['styles']);
		gulp.watch('src/js/**/play-midnight*.js', ['scripts']);
		gulp.watch('src/images/**/*', ['images']);
		gulp.watch('src/**/*.html', ['html']);
		gulp.watch(['src/**/*.json', 'src/**/*.js', '!src/**/play-midnight*'], ['copy']);
	});

	/* Default Task */
	gulp.task('default', ['styles', 'scripts', 'images', 'html', 'copy']);
	gulp.task('build', ['clean'], function() {
		gulp.start('dist');
	});
}());
