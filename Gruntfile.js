/*jshint node:true*/
"use strict";

module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.initConfig({
		jshint: {
			all: {
				src: ['src/*.js', 'bin/*.js'],
				options: {
					esversion: 6,
					node: true,
					undef: true,
					unused: true,
				},
			},
		},
	});

	grunt.registerTask('test', ['jshint']);
	grunt.registerTask('default', ['test']);
};
