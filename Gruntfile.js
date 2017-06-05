/*jshint node:true*/
"use strict";

module.exports = grunt => {
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    jshint: {
      all: {
        src: ['src/*.js', 'src/**/*.js', 'bin/*.js'],
        options: {
          esversion: 6,
          node: true,
          undef: true,
          unused: true,
        },
      },
      test: {
        src: ['test/**/*.js'],
        options: {
          esversion: 6,
          node: true,
          undef: true,
          unused: true,
          predef: ['describe', 'it'],
        },
      },
    },
    mochaTest: {
      test: {
        src: ['test/**/*.js'],
        options: {
          reporter: 'spec',
        },
      },
    },
  });

  grunt.registerTask('test', ['mochaTest']);
  grunt.registerTask('default', ['jshint:all', 'jshint:test', 'test']);
};
