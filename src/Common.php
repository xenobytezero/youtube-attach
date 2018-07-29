<?php 

namespace YoutubeAttach;

class Common {

    public static $OPTION_GROUP = 'ytattach';
    public static $OPTION_NAME_REFRESH_TOKEN = 'ytattach_refresh_token';
    public static $OPTION_NAME_ACCESS_TOKEN = 'ytattach_access_token';
    public static $META_KEY = 'ytattach_videoid';

    public static $encryption_helper = null;
    private static $gapi_client = null;

    public static function init() {

        Common::$encryption_helper = new \WidgetSupport\Encryption(
            realpath(dirname(__FILE__) . "/.."),
            'YTATTACH_ENC_KEY'
        );

        Common::$gapi_client = new \Google_Client();
        Common::$gapi_client->setAuthConfig(realpath(dirname(__FILE__) . '/client_secret.json'));
        Common::$gapi_client->setAccessType('offline');
        Common::$gapi_client->setRedirectUri('postmessage');
        Common::$gapi_client->addScope(\Google_Service_YouTube::YOUTUBE_READONLY);

        $access_token = Common::get_access_token_from_db();
        Common::$gapi_client->setAccessToken($access_token);

    }

    public static function get_access_token() {

        $access_token = Common::$gapi_client->getAccessToken();

        if (Common::$gapi_client->isAccessTokenExpired()){

            $refresh_token = get_option(Common::$OPTION_NAME_REFRESH_TOKEN, '');
            Common::$gapi_client->refreshToken($refresh_token);
            $access_token = Common::$gapi_client->getAccessToken();
            Common::set_access_token_to_db($access_token);

        }

        return[
            'access_token' => $access_token,
            'authed' => true
        ];
    }

    public static function set_auth_code($auth_code) {

        $access_token = Common::$gapi_client->fetchAccessTokenWithAuthCode($auth_code);

        $refresh_token = $access_token['refresh_token'];
        $access_token_json = json_encode($access_token);

        update_option(Common::$OPTION_NAME_ACCESS_TOKEN, $access_token_json);
        update_option(Common::$OPTION_NAME_REFRESH_TOKEN, $refresh_token);
        
        return $access_token;
    }

    public static function get_gapi_creds() {

        return [
            'clientId' => Common::$gapi_client->getClientId()
        ];

    }

    private static function get_access_token_from_db(){
        $access_token_json = get_option(Common::$OPTION_NAME_ACCESS_TOKEN, '');
        $access_token = json_decode($access_token_json, true);
        return $access_token;
    }

    private static function set_access_token_to_db($access_token){
        $access_token_json = json_encode($access_token);
        update_option(Common::$OPTION_NAME_ACCESS_TOKEN, $access_token_json);
    }


}

Common::init();

?>