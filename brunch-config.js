module.exports = {

    // Plugins ----------------------------------------------------------------------

    plugins: {

        sass: {
            mode: 'native',
            debug: 'comments', // or set to 'debug' for the FireSass-style output
            options: {
                importer: [
                    'node-sass-import-once'
                ]
            }
        },

        // --------------------------------------------------------------------------

    },

    modules: {
        autoRequire: {
            'js/plugin.js': ['js/plugin.js']
        }
    },

    // ------------------------------------------------------------------------

    conventions: {
        ignored: [
            // don't compile these things, but watch them
            //'js/**/*'
        ]
    },

    // ------------------------------------------------------------------------

    paths: {
        public: './dist',
        watched: [
            'sass',
            'js',
            'blocks'
        ]
    },

    // ------------------------------------------------------------------------

    files: {
        javascripts: {
            entryPoints: {
                'js/plugin.js': 'js/plugin.js'
            }
        },
        stylesheets: {
            joinTo: {
                'css/yt-attach-sidebar.css': 'sass/yt-attach-sidebar.scss'      
            }
        }
    }

}