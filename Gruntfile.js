module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      lib: ['lib/**/*.js', 'Gruntfile.js'],
      test: 'test/**/*.js'
    },
    simplemocha: {
      injector: {
        src: ['test/injector_tests.js']
      }
    },
		release: {}
	});

	// Default task.
  grunt.registerTask('test', 'simplemocha');
	grunt.registerTask('default', ['jshint', 'test']);

  grunt.loadNpmTasks('grunt-release');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-simple-mocha');
};