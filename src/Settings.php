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
            Common::$OPTION_NAME_ACCESS_TOKEN
        );

        register_setting(
            Common::$OPTION_GROUP, 
            Common::$OPTION_NAME_REFRESH_TOKEN
        );
    }

}


?>