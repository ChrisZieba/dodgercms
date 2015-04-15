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
                    namespace: "dodgercms.templates"
                },
                files: {
                    "templates/compiled/entry.html": "templates/raw/entry.html",
                    "templates/compiled/menu.html": "templates/raw/nav.html",
                    "templates/compiled/nav.html": "templates/raw/menu.html"
                }
            }
        }
    });


    //grunt.loadNpmTasks('grunt-contrib-jshint');
    //grunt.loadNpmTasks('grunt-contrib-uglify');

    //grunt.registerTask('default', ['jshint', 'uglify']);

    grunt.loadNpmTasks('grunt-contrib-handlebars');
   // grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['handlebars']);
};