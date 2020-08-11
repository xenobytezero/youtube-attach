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
            build: {
                command: 'npm run build'
            }
            
        },

        copy: {
        
            deploy: {
                files: [

                    // PHP
                    {src: ['index.php'], dest: deployDest},
                    {src: ['src/**/*.php'], dest: deployDest},

                    // Composer
                    {src: [
                        'vendor/**/*',  
                        '!vendor/google/apiclient-services/src/Google/Service/!(YouTube|YouTubeAnalytics|YouTubeReporting)/**/*',
                        '!vendor/google/apiclient-services/src/Google/Service/!(YouTube.php|YouTubeAnalytics.php|YouTubeReporting.php)*'
                    ], dest: deployDest},

                    // Dist
                    {src: ['dist/**/*.js'], dest: deployDest},

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
    grunt.registerTask('build', ['exec:build']);
    grunt.registerTask('dryRelease', ['build', 'copy:deploy', 'replace:deployedVersionTag'])
    grunt.registerTask('release', ['bump', 'readpkg', 'dryRelease']);
  
  };