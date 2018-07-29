<?php

namespace YoutubeAttach;

class Settings {


    public static function register_meta() {

        register_meta( 'post', Common::$META_KEY, [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string'
        ]);
    }

    public static function register_settings() {
        register_setting(
            Common::$OPTION_GROUP, 
            Common::$OPTION_NAME_ACCESS_TOKEN,
            [
                'sanitize_callback' => ['YoutubeAttach\Settings', 'encrypt_token']
            ]
        );

        register_setting(
            Common::$OPTION_GROUP, 
            Common::$OPTION_NAME_REFRESH_TOKEN,
            [
                'sanitize_callback' => ['YoutubeAttach\Settings', 'encrypt_token']
            ]
        );
    }

    public static function encrypt_token($input) {

        if (isset($_POST['reset'])) {
            $input['accessToken'] = "";
        } else {
            //$input['accessToken'] = \WidgetSupport::enc($input['apiKey']);
        }

        return $input;
    }





}


?>