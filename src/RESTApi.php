<?php 

namespace YoutubeAttach;

class RESTApi {

    public static $OPTION_GROUP = 'youtube-attach';
    public static $OPTION_NAME_ACCESSTOKEN = 'youtube-attach-access-token';

    public static function register_api() {

        register_rest_route('youtube-attach/v1', '/gapiCreds', [
            'methods' => 'GET',
            'callback' => function() {
                return Common::get_gapi_creds();
            },
            'permission_callback' => function () {
              return current_user_can('manage_options');
            }
        ]);

        register_rest_route('youtube-attach/v1', '/accessToken', [
            'methods' => 'GET',
            'callback' => function() {
                return Common::get_access_token();
            },
            'permission_callback' => function () {
              return current_user_can('manage_options');
            }
        ]);

        register_rest_route('youtube-attach/v1', '/authCode', [
            'methods' => 'POST',
            'callback' => function($request) {
                $params = $request->get_params();
                return Common::set_auth_code($params['authCode']);
            },
            'permission_callback' => function () {
              return current_user_can('manage_options');
            }
        ]);


    }

}




?>