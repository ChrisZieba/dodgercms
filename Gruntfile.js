module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: [
        'src/**/*.js'
      ],
      options: {
        ignores: [],
        curly: true,
        eqnull: true,
        browser: true,
        globals: {
          jQuery: true,
          console: true,
          exports: true,
          require: true
        },
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        mangle: false
      },
      build: {
        files: {
          'dist/blackjack-<%= pkg.version %>.min.js': ['src/**/*.js']
        }
      },
    },
    handlebars: {
      compile: {
        options: {
          namespace: "dodgercms.templates",
          //partialsUseNamespace: false,
          //partialRegex: /.*/,
          //partialsPathRegex: /templates\/partials\//,
          // processPartialName: function(filePath) {
          //     var pieces = filePath.split("/");
          //     return pieces[pieces.length - 1];
          // },
          processName: function(filePath) {
            var pieces = filePath.split("/");
            return pieces[pieces.length - 1];
          }
        },
        files: {
          "templates/compiled/entry.html.js": "templates/entry.html"
          // "templates/compiled/nav.html.js": "templates/nav.html",
          // "templates/compiled/menu.html.js": "templates/partials/menu.html"
        }
      }
    }
  });


  // grunt.loadNpmTasks('grunt-contrib-jshint');
  // grunt.loadNpmTasks('grunt-contrib-uglify');

  // grunt.registerTask('default', ['jshint', 'uglify']);
  grunt.loadNpmTasks('grunt-contrib-handlebars');
  // grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['handlebars']);
};