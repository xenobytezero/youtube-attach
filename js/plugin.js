const { registerPlugin } = wp.plugins;

const { __ } = wp.i18n;
const { PanelBody, Button, withAPIData, Dashicon, TextControl, TabPanel, Notice } = wp.components;
const { PluginSidebar, PluginSidebarMoreMenuItem } = wp.editPost;
const { Component, Fragment } = wp.element;
const { withSelect, withDispatch, select, dispatch } = wp.data;
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
			editPost( { meta: newMeta } );
        },
        updatePostTitle(newTitle) {
            editPost( { title: newTitle } );
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

            errorMessage: null,

            search: {
                term: '',
                panelOpen: false,
                results: null,
                isSearching: false
            },

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

    _setSearchState(state) {
        this.setState({search: {...this.state.search, ...state}})
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
            selectedBlock.clientId,
            {content: this.state.currentVideo.description}
        );

    }

    _updateSelectedVideo(videoId) {
        this._updatePostMeta(videoId);
        this._getVideoInfo(videoId);
    }

    _getRecentVideos() {

        console.log('Fetching recent...');

        gapi.client.youtube.search.list({
            part: 'snippet',
            forMine: true,
            maxResults: 10,
            order: 'date',
            type: 'video'
        }).then((response) => {

            let videoList = response.result.items.map((item) => {
                return {
                    title: item.snippet.title,
                    id: item.id.videoId,

                }
            })

            this.setState({videos: videoList});

        }).catch((err) => {
            this._handleError(err);
        })

    }

    _getVideoInfo(videoId) {
    
        gapi.client.youtube.videos.list({
            part: 'snippet, status',
            id: videoId
        }).then((response) => {

            let item = response.result.items[0];

            this.setState({currentVideo: {
                title: item.snippet.title,
                privacyStatus: item.status.privacyStatus,
                publishAt: item.status.publishAt,
                thumbnail: item.snippet.thumbnails.high.url,
                description: item.snippet.description
            }});

        }).catch((err) => {
            this._handleError(err);
        })


    }

    _searchForVideo(queryStr) {

        this._setSearchState({
            isSearching: true,
            results: null
        })

        gapi.client.youtube.search.list({
            part: 'snippet',
            forMine: true,
            maxResults: 10,
            order: 'date',
            type: 'video',
            q: queryStr
        }).then((response) => {

            let videoList = response.result.items.map((item) => {
                return {
                    title: item.snippet.title,
                    id: item.id.videoId,

                }
            })

            this._setSearchState({
                isSearching: false,
                results: videoList
            });

        }).catch((err) => {
            this._handleError(err);
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

        return date.toDateString({
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
        }) + ' ' + date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    _handleError(err) {
        this.setState({errorMessage: err.result.error.message});
    }

    _onSearchBoxKeyPress(e) {
        if (e.key === 'Enter') { 
            this._searchForVideo(this.state.search.term); 
        }
    }

    _onSearchResultClicked(result) {

        this._updateSelectedVideo(result.id)

        this._setSearchState({
            results: null,
            term: ''
        });
    }

    _onTabSelected(tabName) {
        
        if (tabName === 'recent') {
            if (this.state.videos === null) {
                this._getRecentVideos();
            }
        }
    
    }

    render() {

        return <Fragment> 

            <PluginSidebarMoreMenuItem target="yt-attach-sidebar">
                YouTube Attach
            </PluginSidebarMoreMenuItem>

            <PluginSidebar
                name="yt-attach-sidebar"
            >
            <div class="ytattach-plugin-sidebar">

                {(this.state.errorMessage !== null && 
                    <Notice
                        status="error"
                        onRemove={() => { this.setState({errorMessage: null}); }}
                    >{this.state.errorMessage}</Notice>
                )}

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

                    this.state.isAuthorized && <Fragment>

                        {this.state.currentVideo === null && <Fragment>
                            <div class="no-video">
                                <span>No Video</span>
                            </div>
                        </Fragment>}

                        {this.state.currentVideo !== null && <div class="current-video">

                            <h3 class="title">
                                <Dashicon className={'loading-spinner'} icon={this._getPrivacyIcon(this.state.currentVideo)}/>
                                <span>{this.state.currentVideo.title}</span>
                            </h3>

                            {this._isPostScheduled(this.state.currentVideo) && 
                                <p class="scheduled-date"> Scheduled for - {this._getFormattedPublishDate(this.state.currentVideo.publishAt)} </p>
                            }

                            <img src={this.state.currentVideo.thumbnail}></img>

                            <Button
                                isPrimary
                                onClick={() => { this._useVideoTitle(); }}
                            ><span>Use Video Title</span></Button>

                            <Button
                                isPrimary
                                onClick={() => { this._useVideoDescription(); }}
                            ><span>Add Description To Selected Block</span></Button>


                        </div>}

                        <hr class="main-hr"/>

                        <TabPanel className='tab-panel'
                            onSelect={(tabName) => { this._onTabSelected(tabName); }}
                            tabs={[
                                {
                                    name: 'search',
                                    title: 'Search',
                                    className: 'tab-search'
                                },
                                {
                                    name: 'recent',
                                    title: 'Recent',
                                    className: 'tab-recent'
                                }
                            ]}
                        
                        >
                            {( tab ) => {

                                const recent = <Fragment><div class={'tab ' + tab.className + '-panel'}>

                                    {this.state.videos === null && <p>Getting video list...</p>}

                                    {this.state.videos !== null && [
                                        <ul class="result-list">
                                            {this.state.videos.map((result, index) => (
                                                <li key={result.id}>
                                                    <a onClick={() => this._updateSelectedVideo(result.id)}>
                                                        {result.title}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    ]}

                                </div></Fragment>

                                const search = <Fragment><div class={'tab ' + tab.className + '-panel'}>

                                    <TextControl
                                        className='search-input'
                                        value={this.state.searchTerm}
                                        onChange={(val) => { this._setSearchState({term: val}); }}
                                        onKeyPress={(e) => { this._onSearchBoxKeyPress(e); }}
                                    />

                                    <Button
                                        className='search-button'
                                        isPrimary
                                        isBusy={this.state.search.isSearching}
                                        label='Search'
                                        onClick={() => { this._searchForVideo(this.state.search.term); } }
                                        onKeyPress={(e) => { this._onSearchBoxKeyPress(e); }}
                                    >Search</Button>

                                    {this.state.search.results !== null && <Fragment>
                                        
                                        <hr/>

                                        {this.state.search.results !== null && this.state.search.results.length === 0 && <h3 class="pholder">No Results</h3>}

                                        {this.state.search.results !== null && this.state.search.results.length !== 0 && <Fragment>

                                            <ul class="result-list">
                                                {this.state.search.results.map((result, index) => (
                                                    <li key={index}><a onClick={() => this._onSearchResultClicked(result)}>
                                                        {result.title}
                                                    </a></li>
                                                ))}
                                            </ul>

                                        </Fragment>}

                                    </Fragment>}

                                </div></Fragment>
                                
                                if (tab.name === 'recent') {
                                    return recent;
                                } else {
                                    return search;
                                }

                            }}

                        </TabPanel>

                    </Fragment>

                ]
            
            )}

            </div></PluginSidebar>

        </Fragment>

    }

}

registerPlugin('yt-attach', {
    icon: 'video-alt3',
    render: compose( [
        applyWithSelect,
        applyWithDispatch
    ] )( YTSidebar )
});