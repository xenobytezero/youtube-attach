<?php 

namespace YoutubeAttach;

class Common {

    public static $OPTION_GROUP = 'ytattach';
    public static $OPTION_NAME_REFRESH_TOKEN = 'ytattach_refresh_token';
    public static $OPTION_NAME_ACCESS_TOKEN = 'ytattach_access_token';
    public static $META_KEY = 'ytattach_videoid';

    public static $encryption_helper = null;

    private static $api_key = null;
    private static $gapi_client = null;

    public static function init() {

        Common::$encryption_helper = new \WidgetSupport\Encryption(
            realpath(dirname(__FILE__) . "/.."),
            'YTATTACH_ENC_KEY'
        );

        $api_key_json = file_get_contents(realpath(dirname(__FILE__) . '/../settings/api_key.json'));
        Common::$api_key = json_decode($api_key_json, true)['apiKey'];

        Common::reset_gapi();
        
        $access_token = Common::get_access_token_from_db();
        if ($access_token !== null){
            Common::$gapi_client->setAccessToken($access_token);
        }

    }

    public static function get_access_token() {

        $is_authed = true;
        $access_token = Common::$gapi_client->getAccessToken();

        if ($access_token === null){
            $is_authed = false;
        } else {
            if (Common::$gapi_client->isAccessTokenExpired()){
                $refresh_token = Common::get_refresh_token_from_db();
                Common::$gapi_client->refreshToken($refresh_token);
                $access_token = Common::$gapi_client->getAccessToken();
                Common::set_access_token_to_db($access_token);
            }
        }

        return[
            'access_token' => $access_token,
            'authed' => $is_authed,

        ];
    }

    public static function set_auth_code($auth_code) {

        $access_token = Common::$gapi_client->fetchAccessTokenWithAuthCode($auth_code);
        $refresh_token = $access_token['refresh_token'];

        Common::set_refresh_token_to_db($refresh_token);
        Common::set_access_token_to_db($access_token);

        return $access_token;
    }

    public static function get_gapi_creds() {
        return [
            'clientId' => Common::$gapi_client->getClientId(),
            'apiKey' => Common::$api_key
        ];

    }

    public static function revoke_access() {
        update_option(Common::$OPTION_NAME_ACCESS_TOKEN, null);
        update_option(Common::$OPTION_NAME_REFRESH_TOKEN, null);
        Common::reset_gapi();
    }

    private static function get_access_token_from_db(){
        ///debug_print_backtrace();
        $enc_access_token_json = get_option(Common::$OPTION_NAME_ACCESS_TOKEN, null);
        $access_token = null;
        if ($enc_access_token_json !== ''){
            $access_token_json = Common::$encryption_helper->dec($enc_access_token_json);
            $access_token = json_decode($access_token_json, true);
        }
        return $access_token;
    }
    private static function get_refresh_token_from_db() {
        //debug_print_backtrace();
        $enc_refresh_token = get_option(Common::$OPTION_NAME_REFRESH_TOKEN, null);
        $refresh_token = null;
        if ($enc_refresh_token !== ''){
            $refresh_token = Common::$encryption_helper->dec($enc_refresh_token);
        }
        return $refresh_token;
    }

    private static function set_access_token_to_db($access_token){
        $access_token_json = json_encode($access_token);
        $enc_access_token = Common::$encryption_helper->enc($access_token_json);
        update_option(Common::$OPTION_NAME_ACCESS_TOKEN, $enc_access_token);
    }
    private static function set_refresh_token_to_db($refresh_token){
        $enc_refresh_token = Common::$encryption_helper->enc($refresh_token);
        update_option(Common::$OPTION_NAME_REFRESH_TOKEN, $enc_refresh_token);
    }

    private static function reset_gapi() {
        Common::$gapi_client = new \Google_Client();
        Common::$gapi_client->setAuthConfig(realpath(dirname(__FILE__) . '/../settings/client_secret.json'));
        Common::$gapi_client->setAccessType('offline');
        Common::$gapi_client->setRedirectUri('postmessage');
        Common::$gapi_client->addScope(\Google_Service_YouTube::YOUTUBE_READONLY);

    }


}

Common::init();

?>