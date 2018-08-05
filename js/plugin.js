const { registerPlugin } = wp.plugins;

const { __ } = wp.i18n;
const { PanelBody, Button, withAPIData, Dashicon } = wp.components;
const { PluginSidebar, PluginPostStatusInfo } = wp.editPost;
const { Component } = wp.element;
const { withSelect, withDispatch, select, dispatch} = wp.data;
const { compose } = wp.compose;

const apiRequest = wp.apiRequest;

const META_KEY = 'ytattach_videoid';

// Fetch the post meta.
const applyWithSelect = withSelect( ( select ) => {
	const { getEditedPostAttribute } = select( 'core/editor' );

	return {
        meta: getEditedPostAttribute( 'meta' )
    };
    
} );

// Provide method to update post meta.
const applyWithDispatch = withDispatch( ( dispatch, { meta } ) => {
	const { editPost } = dispatch( 'core/editor' );

	return {
		updateMeta( newMeta ) {
			editPost( { meta: Object.assign(meta, newMeta) } ); // Important: Old and new meta need to be merged in a non-mutating way!
        },
        updatePostTitle(newTitle) {
            editPost( { title: newTitle } ); // Important: Old and new meta need to be merged in a non-mutating way!
        }
    };
    
} );



class YTSidebar extends Component {

    constructor(props) {

        super(props);

        this.props = props;

        this.state = {
            isApiReady: false,
            isAuthorized: false,
            isLoaded: false,

            videos: null,
            currentVideo: null,

            authPanelOpen: true

        }

        this._authClient = null;

    }

    componentDidMount() {

        gapi.load('client:auth2', () => {

            this._getGAPICreds()
                .then((gapiCreds) => {

                    return new Promise((res,rej) => {
                        gapi.client.init({
                            clientId: gapiCreds.clientId,
                            apiKey: gapiCreds.apiKey,
                            scope: 'https://www.googleapis.com/auth/youtube.readonly',
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
                        }).then(() => {
                            return res();
                        })
                    })

                }).then(() => {
                    this.setState({ isApiReady: true })
                    return this._getAccessToken();
                }).then((accessTokenResponse) => {

                    let isAuthorized = accessTokenResponse.authed;

                    this.setState({ isLoaded: true })

                    if (isAuthorized) {
                        gapi.client.setToken(accessTokenResponse.access_token);
                        this._onAuthorized();
                    }

                })

        });
    }



    _sendAuthCode(authCode) {
        return this._wrapApiRequest({
            path: '/youtube-attach/v1/authCode',
            method :'POST',
            data: {authCode: authCode}
        })
    }

    _getAccessToken() {
        return this._wrapApiRequest({
            path: '/youtube-attach/v1/accessToken',
            method :'GET'
        })
    }

    _getGAPICreds() {
        return this._wrapApiRequest({
            path: '/youtube-attach/v1/gapiCreds',
            method :'GET'
        })
    }

    _revokeAccess() {
        return this._wrapApiRequest({
            path: '/youtube-attach/v1/revokeAccess',
            method: 'DELETE'
        })
    }

    _wrapApiRequest(requestObj){
        return new Promise((res, rej) => {
            apiRequest(requestObj) 
            .then((data, textStatus, jqXHR) => { return res(data, textStatus, jqXHR)})
            .fail((jqXHR, textStatus, errorThrown) => { return rej(jqXHR, textStatus, errorThrown); })
        });
    }


    _authorize(){
        gapi.auth2.getAuthInstance().grantOfflineAccess()
            .then((response) => { 
                return this._sendAuthCode(response.code)
                    .then((accessToken) => {
                        gapi.client.setToken(accessToken);
                        this._onAuthorized();
                    })   
            })          
    }   

    _deauthorize() {
        this._revokeAccess()
            .then(() => {
                this.setState({isAuthorized: false})
            })
    }


    _onAuthorized() {


        this.setState({
            isAuthorized: true,
            authPanelOpen: false
        });

        this._getVideos();

        let videoId = this.props.meta[META_KEY];
        if (videoId !== ''){
            this._getVideoInfo(videoId);
        }
    }

    _updatePostMeta(videoId) {
        var metaObj = {};
        metaObj[META_KEY] = videoId;
        this.props.updateMeta(metaObj);
    }

    _useVideoTitle() {
        this.props.updatePostTitle(this.state.currentVideo.title);
    }

    _useVideoDescription() {

        let sel = select('core/editor');
        let dis = dispatch('core/editor');

        let selectedBlock = sel.getSelectedBlock();

        if (selectedBlock === null) {
            console.log('No selected block!');
        }

        dis.updateBlockAttributes(
            selectedBlock.uid,
            {content: this.state.currentVideo.description}
        );

    }

    _updateSelectedVideo(videoId) {
        this._updatePostMeta(videoId);
        this._getVideoInfo(videoId);
    }

    _getVideos() {

        gapi.client.youtube.search.list({
            part: 'snippet',
            forMine: true,
            maxResults: 10,
            order: 'date',
            type: 'video'
        })
        .then((response) => {

            let videoList = response.result.items.map((item) => {
                return {
                    title: item.snippet.title,
                    id: item.id.videoId,

                }
            })

            this.setState({videos: videoList});

        })

    }

    _getVideoInfo(videoId) {
    
        gapi.client.youtube.videos.list({
            part: 'snippet, status',
            id: videoId
        })
        .then((response) => {

            let item = response.result.items[0];

            this.setState({currentVideo: {
                title: item.snippet.title,
                privacyStatus: item.status.privacyStatus,
                publishAt: item.status.publishAt,
                thumbnail: item.snippet.thumbnails.high.url,
                description: item.snippet.description
            }});

        })


    }

    _onVideoListItemClick(videoId) {
        this._updatePostMeta(videoId);
        this._getVideoInfo(videoId);
    }

    _isPostScheduled(result){
        return result.privacyStatus === 'private' && result.publishAt !== undefined
    }

    _getPrivacyIcon(result) {

        if (this._isPostScheduled(result)) {
            return 'calendar-alt'
        } else if (result.privacyStatus === 'private'){
            return 'lock'; 
        } else if (result.privacyStatus === 'public'){
            return 'admin-site';
        } else {
            return 'warning';
        }

    }

    _getFormattedPublishDate(publishAt){
        var date = new Date(publishAt);

        return date.toLocaleDateString({
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
        }) + ' ' + date.toLocaleTimeString({
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }


    render() {

        return <PluginSidebar
            name="yta-apiKey"
        >
        <div class="ytattach-plugin-sidebar">

            {(!this.state.isApiReady && !this.state.isLoaded && <h3 class="loading-text">Loading API...</h3>)}

            {(this.state.isApiReady && !this.state.isLoaded && <h3 class="loading-text">Getting authentication...</h3>)}

            {(this.state.isApiReady && this.state.isLoaded && [
            
                <PanelBody 
                    title={"Authentication - " + (this.state.isAuthorized ? 'Authorized' : 'Not Authorized')}
                    opened={this.state.authPanelOpen}
                    onToggle={() => { this.setState({authPanelOpen: !this.state.authPanelOpen})}}
                >
                    
                    {!this.state.isAuthorized && [

                        <p>This plugin requires permission to access your YouTube account</p>,
            
                        <button
                            class="button button-primary"
                            onClick={() => { this._authorize(); }}
                        >Authorize With YouTube</button>

                    ]}

                    {this.state.isAuthorized && [
                    
                        <p>Plugin is already authorised</p>,
                
                        <button
                            class="button button-primary"
                            onClick={() => { this._deauthorize() ; }}
                        >DeAuthorize Plugin</button>
                
                    ]}

                </PanelBody>,

                this.state.isAuthorized && 
                    <PanelBody title="Current Video">

                        {this.state.currentVideo === null && <p>No current video.</p>}

                        {this.state.currentVideo !== null && 

                            <div class="current-video">

                                <h3 class="title">
                                    <Dashicon icon={this._getPrivacyIcon(this.state.currentVideo)} size='16'/>
                                    <span>{this.state.currentVideo.title}</span>
                                </h3>

                                {this._isPostScheduled(this.state.currentVideo) && 
                                    <p class="scheduled-date"> Scheduled for - {this._getFormattedPublishDate(this.state.currentVideo.publishAt)} </p>
                                }

                                <img src={this.state.currentVideo.thumbnail}></img>

                                <button
                                    class="button button-primary"
                                    onClick={() => { this._useVideoTitle(); }}
                                >Use Video Title</button>

                                <button
                                    class="button button-primary"
                                    onClick={() => { this._useVideoDescription(); }}
                                >Add Description To Selected Block</button>


                            </div>
                            
                        }

                    </PanelBody>,

                this.state.isAuthorized && 
                    <PanelBody title="Channel Videos">

                        {this.state.videos === null && <p>Getting video list...</p>}

                        {this.state.videos !== null && [
                        
                            <h3>Recent Videos</h3>,

                            <ul class="results">
                                {this.state.videos.map((result, index) => (
                                    <li>
                                        <a onClick={() => this._updateSelectedVideo(result.id)}>
                                            {result.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ]}

                    </PanelBody>

            ]
        
        )}

        </div>

        </PluginSidebar>

    }

}

registerPlugin('yt-attach', {
    icon: 'video-alt3',
    render: compose( [
        applyWithSelect,
        applyWithDispatch
    ] )( YTSidebar )
});