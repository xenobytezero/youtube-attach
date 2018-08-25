module.exports = function(grunt) {



    let deployDest = 'deploy/<%= pkg.version %>/youtube-attach/';

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-bump');
    grunt.loadNpmTasks('grunt-replace');
    grunt.loadNpmTasks('grunt-exec');

    // Project configuration.
    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        exec: {
            options: {
            },

            brunchBuild: {
                command: 'brunch b'
            }
            
        },

        copy: {
        
            deploy: {
                files: [

                    // PHP
                    {src: ['index.php'], dest: deployDest},
                    {src: ['src/**/*.php'], dest: deployDest},

                    // Composer
                    {src: ['composer.json', 'composer.lock'], dest: deployDest},
                    {src: ['vendor/**/*'], dest: deployDest},

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
        },

        bump: {
            options: {
                push:false
            }
        },

        replace: {
            deployedVersionTag: {

                src: [deployDest + '/index.php'],
                dest: deployDest + '/index.php',

                options: {
                    patterns: [{
                        match: 'releaseVersion',
                        replacement: '<%= pkg.version %>'
                    }]
                }
            }
        }


    });

    grunt.registerTask('readpkg', 'Read in the package.json file', function() {
        grunt.config.set('pkg', grunt.file.readJSON('./package.json'));
    });

    // Default task(s).
    grunt.registerTask('build', ['exec:brunchBuild']);
    grunt.registerTask('release', ['bump', 'readpkg', 'build', 'copy:deploy', 'replace:deployedVersionTag']);
  
  };