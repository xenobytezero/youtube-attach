<?php

/*
    Plugin Name: YouTube Attach
    Plugin URI: 
    Description: 
    Version: @@releaseVersion
    Author: Euan Robertson
    Author Email: xenobytezero@gmail.com
    License:
*/

require_once('vendor/autoload.php');

require_once('src/Common.php');
require_once('src/RESTApi.php');
require_once('src/Settings.php');

add_action('admin_init', ['YoutubeAttach\Settings', 'register_settings']);
add_action('rest_api_init', ['YoutubeAttach\RESTApi', 'register_api']);
add_action('init', ['YoutubeAttach\Settings', 'register_meta']);

add_action('init', function() {

    wp_register_script(
        'yta-plugin',
        plugins_url('/dist/js/plugin.js', __FILE__),
        [
            'yta-google-api',
            'wp-plugins',
            'wp-components',
            'wp-element',
            'wp-edit-post',
            'wp-data',
            'wp-compose',
            'wp-api-request'
        ]
    );

    wp_register_script(
        'yta-google-api',
        'https://apis.google.com/js/api.js'
    );

    wp_register_style(
        'yta-plugin-sidebar',
        plugins_url('/dist/css/yt-attach-sidebar.css', __FILE__)
    );

});

add_action( 'enqueue_block_editor_assets', function() {
    wp_enqueue_script('yta-plugin');
    wp_enqueue_style('yta-plugin-sidebar');
});



?>