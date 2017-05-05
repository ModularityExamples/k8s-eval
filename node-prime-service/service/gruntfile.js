module.exports = function(grunt) {
  // Project configuration
  grunt.initConfig({
    env: {
      test: {
        POSTGRES_URL: 'postgres://postgres:mysecretpassword@192.168.50.100:5432/prime_test',
      }
    },
    jshint: {
      files: [], // TODO: re-enable '*.js'and fix issues
      options: {
        undef: true,
        unused: false,
        globals: {
          'require': true,
          'process': true
        }
      }
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['./test/*.js']
      }
    },
    watch:{
      all:{
        files: ['./*.js', './test/*.js'],
        tasks: ['tests']
      }
    }
  });

  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('tests', ['env', 'mochaTest']);
  grunt.registerTask('default', ['env', 'jshint', 'mochaTest']);
};
