module.exports = function(grunt) {



    let deployDest = 'deploy/<%= pkg.version %>/youtube-attach/';

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Project configuration.
    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        copy: {
        
            deploy: {
                files: [

                    // PHP
                    {src: ['index.php'], dest: deployDest},
                    {src: ['src/**/*.php'], dest: deployDest},

                    // Composer
                    {src: ['composer.json', 'composer.lock'], dest: deployDest},

                    // JS
                    {src: ['dist/js/**/*.js'], dest: deployDest},

                    // CSS
                    {src: ['dist/css/**/*.css'], dest: deployDest},

                    // Other
                    {
                        src: [
                            'README.md',
                            'LICENCE'
                        ], 
                        dest: deployDest
                    }


                ]

            }


      }
    });

    // Default task(s).
    grunt.registerTask('default', ['uglify']);
  
  };