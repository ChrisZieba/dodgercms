module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['lib/**/*.js', 'public/js/*.js'],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        mangle: false
      },
      build: {
        files: {
          'public/js/dist/login.min.js': 'public/js/login.js',
          'public/js/dist/app.min.js': 'public/js/app.js',
          'public/js/dist/dodgercms.min.js': 'lib/**/*.js'
        }
      },
    },
    cssmin: {
      combine: {
        files: {
          'public/css/dist/login.min.css' : ['public/css/login.css'],
          'public/css/dist/app.min.css' : ['public/css/app.css', 'public/css/vendor/jstree.proton.css']
        }
      }
    },
    handlebars: {
      compile: {
        options: {
          namespace: "dodgercms.templates",
          processName: function(filePath) {
            var pieces = filePath.split("/");
            return pieces[pieces.length - 1];
          }
        },
        files: {
          "public/js/dist/entry.min.js": "templates/entry.html"
        }
      }
    },
    mocha: {
      all: {
        src: ['test/runner.html'],
      },
      options: {
        run: true
      }
    },
    watch: {
      scripts: {
        files: ['lib/**/*.js', 'public/js/*.js'],
        tasks: ['uglify'],
        options: {
          spawn: false,
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-handlebars');
  grunt.loadNpmTasks('grunt-mocha');

  grunt.registerTask('default', ['handlebars', 'mocha', 'jshint', 'cssmin', 'uglify']);
};