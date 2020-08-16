import React, { Component } from "react";
import "./Discussion.css";
import Chat from "./Chat/Chat";
import Simulation from "./Simulation/Simulation";
import Graph from "./Graph/Graph";
import AlertList from "./Alert/AlertsList";
import UserStats from "./Statistics/UserStats";
import DiscussionStats from "./Statistics/DiscussionStats";
import ReactTooltip from "react-tooltip";
import { connect } from "react-redux";
import VisualizationsModal from "./Modals/VisualizationsConfigModal";
import Loader from "react-loader-spinner";
import MultipleUsersAlerts from "./Modals/MultipleUsersAlerts";
import socketConnection from '../Socket/Socket'

class Discussion extends Component {
    constructor(props) {
        super(props);
        this.socket = socketConnection;
        this.defaultConfig = {};
        this.state = {
            shownMessages: [],
            shownNodes: [],
            shownLinks: [],
            shownAlerts: [],
            discussionId: this.props.simulationCode,
            showVisualizationSettingsModal: false,
            showSentMultipleAlertsModal: false,
            shownTitle: '',
            fullTitle: '',
            selectedUser: '',
            lastMessage: {},
            alertedMessage: {},
            graph: true,
            alerts: true,
            statisticsUser: true,
            statisticsDiscussion: true,
            isLoading: false,
            language: "English",
            directionClass: "leftToRight",
            selectedMessageId: null,
            selectedLink: null
        };
    }
    /**
     * Initialize the socket event listeners and update the state
     * 
     */
    componentDidMount() {
        this.setState({ isLoading: true });
        this.socket.on("unauthorized", () => {
            this.props.onLogOut();
            this.props.history.push("/");
        });

        this.socket.on("end_session", () => {
            this.props.history.push("/");
        });

        this.socket.on("error", (response) => {
            console.log({ response });
        });

        this.socket.on("new configuration", (response) => {
            this.handleNewConfig(response);
        });

        if (this.props.userType === "MODERATOR")
            this.setState({
                graph: true,
                alerts: true,
                statistics: true,
            });
    }
    /**
     * Send a leave message using the socket
     * 
     */
    componentWillUnmount() {
        const data = {
            discussionId: this.state.discussionId,
            username: this.props.currentUser
        };
        this.socket.emit('leave', data);
    }

    /**
     * Set the default visual config
     * @param discussionVisualConfig - The discussion visual config
     * @param userVisualConfig - The user visual config
     */
    setDefaultVisualConfig = (discussionVisualConfig, userVisualConfig) => {
        this.defaultConfig = discussionVisualConfig;
        if (this.props.userType === 'USER') {
            let elements = ['graph', 'statisticsUser', 'statisticsDiscussion', 'alerts'];
            if (userVisualConfig) {
                elements.forEach(element => {
                    this.setState({
                        [element]: userVisualConfig[element],
                    });
                })

            } else {
                elements.forEach(element => {
                    this.setState({
                        [element]: discussionVisualConfig[element],
                    });
                });
            }
        }
    };

    /**
     * Set the moderator settings 
     * @param element - The chosen elemnt
     * @param toShow - If to show the element or not
     */
    setModeratorSettings = (element, toShow) => {
        this.setState({
            [element]: toShow,
        });
    };

    /**
     * Update the alert message
     * @param message - The new message
     * 
     */
    updateAlertedMessage = (message) => {
        this.setState({
            alertedMessage: message
        });
    };

    /**
     * Update the shown state
     * @param newMessages - The new messages
     * @param newNodes - The new nodes
     * @param newLinks - The new links
     * @param newAlerts - The new alerts
     * @param lastMessage - The new last message
     * 
     */
    updateShownState(newMessages, newNodes, newLinks, newAlerts, lastMessage) {
        this.setState({
            shownMessages: newMessages,
            shownNodes: newNodes,
            shownLinks: newLinks,
            shownAlerts: newAlerts,
            lastMessage: lastMessage,
        });
    }

    /**
     * Update the selected user
     * @param username - The new user
     * 
     */
    updateSelectedUserHandler(username) {
        this.setState({ selectedUser: username });
    }

    /**
     * Update the selected link
     * @param link - The new link
     * 
     */
    updateSelectedLinkHandler = (link) => {
        this.setState({ selectedLink: link });
    };

    /**
     * Update the title
     * @param title - The new title
     * 
     */
    setTitle = (title) => {
        let dots = '';
        if (title.length > 45) {
            dots = '...';
        }
        this.setState({
            fullTitle: title,
            shownTitle: `${title.slice(0, 45)} ${dots}`
        });
    };

    /**
    * Copy the discussion id when the share button is clicked
    * 
    * 
    */
    handleShareClick = () => {
        let dummy = document.createElement("input");
        document.body.appendChild(dummy);
        dummy.setAttribute("value", this.state.discussionId);
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
    };

    /**
     * Update the language
     * @param lang - The new language
     * 
     */
    updateLanguage = (lang) => {
        if (lang === "English") {
            this.setState({
                language: lang,
                directionClass: 'leftToRight'
            });
        } else {
            this.setState({
                language: lang,
                directionClass: 'rightToLeft'
            });
        }
    }

    /**
     * Get the selected user
     * 
     * 
     */
    getSelectedUser() {
        return this.state.selectedUser;
    }

    /**
     * Get the shown messages
     * 
     * 
     */
    getShownMessages() {
        return this.state.shownMessages;
    }

    /**
     * Get the shown links
     * 
     * 
     */
    getShownLinks() {
        return this.state.shownLinks;
    }

    /**
     * Get the shown nodes
     * 
     * 
     */
    getShownNodes() {
        return this.state.shownNodes;
    }

    /**
     * Update if the visual config modal is open or closed
     * @param isOpen - If it is open
     * 
     */
    updateVisualConfigModalHandler = (isOpen) => {
        this.setState({
            showVisualizationSettingsModal: isOpen,
        });
    };

    /**
     * Update if the send multiple alerts modal is open or closed
     * @param isOpen - If it is open
     * 
     */
    updateSentMultipleAlertsModalHandler = (isOpen) => {
        this.setState({
            showSentMultipleAlertsModal: isOpen,
        });
    };

    /**
     * Close the session
     * 
     */
    handleEndSession = () => {
        const data = {
            token: this.props.token,
            discussionId: this.state.discussionId,
        };
        this.socket.emit("end_session", data);
    };

    /**
     * Reset the filter
     * 
     */
    resetFilterHandler = () => {
        this.setState({
            selectedLink: null
        })
    };

    /**
     * Update the config
     * @param response - The new settings
     */
    handleNewConfig = (response) => {
        if (this.props.userType === 'USER') {
            for (let setting in response) {
                this.setState({ [setting]: response[setting] });
            }
        }
    };

    /**
     * Set the loading state to false
     * 
     */
    handleFinishLoading = () => {
        this.setState({ isLoading: false });
    };

    /**
     * Update an insight visibility
     * 
     * @param insight - The chosen insight
     * @param show - Its visibility
     */
    handleInsightVisibility = (insight, show) => {
        this.setState({ [insight]: show });
    };

    /**
     * Update the selected message on alert click
     * 
     * @param messageId - The chosen message id
     */
    handleAlertClick = (messageId) => {
        if (this.state.selectedMessageId === messageId) {
            this.setState({ selectedMessageId: null })
        } else {
            this.setState({ selectedMessageId: messageId });
        }
    };

    /**
     * Convert string to hashcode
     * 
     * @param str - The string
     */
    hashCode = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    };

    /**
     * Convert int to rgb
     * 
     * @param i - The integer
     */
    intToRGB = (i) => {
        const c = (this.hashCode(i) & 0x00ffffff).toString(16).toUpperCase();
        return "00000".substring(0, 6 - c.length) + c;
    };

    /**
     * Manage the download process of the current discussion
     * 
     */
    download = () => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', () => {
            if (xhr.status === 401) {
                this.props.onLogOut();
                return;
            }
            const data = JSON.parse(xhr.responseText)
            if (!data) {
                console.log("no data for download")
                return;
            }
            const csv = data.csv
            const discussionDetails = data.discussion;
            const tree = data.tree;
            tree.node.extra_data["DiscussionDetails"] = discussionDetails;
            this.downloadCsvFile(csv, discussionDetails.title);
            this.downloadJsonFile(tree, discussionDetails.title);
        });
        xhr.open('GET', process.env.REACT_APP_API + '/api/download/' + this.state.discussionId);
        xhr.setRequestHeader("Authorization", "Basic " + btoa(this.props.token + ":"));
        xhr.send();
    }

    /**
     * Download the discussion as a csv file
     * 
     * @param csvContent - The csv content of the discussion
     * @param filename - The file name
     */
    downloadCsvFile(csvContent, filename) {
        const BOM = "\uFEFF";
        csvContent = BOM + csvContent;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename + ".csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Download the discussion as a json file
     * 
     * @param jsonObj - The json object of the discussion
     * @param filename - The file name
     */
    downloadJsonFile(jsonObj, filename) {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonObj));
        var link = document.createElement("a");
        link.setAttribute("href", dataStr);
        link.setAttribute("download", filename + ".json");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Render the discussion page
     * 
     */
    render() {
        return (
            <div className="App" >
                {this.state.isLoading && (
                    <Loader className="mt-5 text-center" type="TailSpin" color="#007bff" height={300} width={300} />
                )}
                <React.Fragment >
                    <div className="row text-center" >
                        {!this.state.isLoading &&
                            <React.Fragment >
                                <span className="col-4" >
                                    {this.props.userType !== "USER" &&
                                        <button
                                            type="button" className="btn btn-info"
                                            onClick={this.download} >
                                            <i class="fa fa-download" aria-hidden="true"></i>&nbsp;Download
                                    </button >
                                    }
                                    {(this.props.userType !== "USER" && this.props.isSimulation === "false") &&
                                        <React.Fragment >
                                            <button
                                                type="button" className="btn btn-danger endSession"
                                                onClick={this.handleEndSession} >
                                                End Session
                                        </button >
                                            <button
                                                className="btn multipleAlerts"
                                                onClick={() => this.resetFilterHandler()} >
                                                Show All Messages
                                        </button >
                                        </React.Fragment >
                                    }
                                </span >
                                <span className="col-4 my-auto" >
                                    <h4 >
                                        <b data-tip={this.state.fullTitle} >{this.state.shownTitle}</b >
                                        <i
                                            className="fas fa-share-square text-primary pl-2 cursor-pointer"
                                            data-tip="Copied!" data-event="click" />
                                        {this.props.userType !== "USER" &&
                                            <i
                                                className="fas fa-cog cursor-pointer pl-2"
                                                onClick={() => this.updateVisualConfigModalHandler(true)} />
                                        }
                                    </h4 >
                                    <ReactTooltip eventOff="mousemove" afterShow={this.handleShareClick} />
                                </span >
                                {(this.props.userType !== "USER") &&
                                    <VisualizationsModal
                                        isOpen={this.state.showVisualizationSettingsModal}
                                        discussionId={this.state.discussionId}
                                        updateVisibility={this.updateVisualConfigModalHandler.bind(this)}
                                        isSimulation={this.props.isSimulation === "true"}
                                        lastMessage={this.state.lastMessage}
                                        defaultConfig={this.defaultConfig}
                                        socket={this.socket}
                                        setModeratorSettings={() => this.setModeratorSettings.bind(this)}
                                    />
                                }
                                {(this.props.userType === "MODERATOR" || this.props.userType === "ROOT") &&
                                    <MultipleUsersAlerts
                                        isOpen={this.state.showSentMultipleAlertsModal}
                                        discussionId={this.state.discussionId}
                                        updateVisibility={this.updateSentMultipleAlertsModalHandler.bind(this)}
                                        alertedMessage={this.state.alertedMessage}
                                        socket={this.socket}
                                        directionClass={this.state.directionClass}
                                    />
                                }
                            </React.Fragment >
                        }
                        <span className="col-4" >
                            {this.props.isSimulation === "true" &&
                                <Simulation
                                    updateShownState={this.updateShownState.bind(this)}
                                    discussionId={this.props.simulationCode}
                                    setTitle={this.setTitle}
                                    messagesOrder={"chronological"}
                                    nodeColor={this.intToRGB}
                                    socket={this.socket}
                                    language={this.state.language}
                                    directionClass={this.state.directionClass}
                                    isLoading={this.state.isLoading}
                                    handleFinishLoading={this.handleFinishLoading}
                                    updateVisualConfig={this.setDefaultVisualConfig}
                                    updateLanguage={this.updateLanguage}
                                />
                            }
                        </span >
                    </div >
                    {!this.state.isLoading && <hr />}
                    <div className="row content mr-3 ml-1" >
                        <div className="discussion-col col-lg-6 col-md-12 px-1" >
                            <Chat
                                messages={this.state.shownMessages}
                                isSimulation={this.props.isSimulation === "true"}
                                updateShownState={this.updateShownState.bind(this)}
                                discussionId={this.props.simulationCode}
                                updateSelectedUser={this.updateSelectedUserHandler.bind(this)}
                                setTitle={this.setTitle}
                                nodeColor={this.intToRGB}
                                socket={this.socket}
                                language={this.state.language}
                                directionClass={this.state.directionClass}
                                isLoading={this.state.isLoading}
                                handleFinishLoading={this.handleFinishLoading}
                                updateVisualConfig={this.setDefaultVisualConfig}
                                updateLanguage={this.updateLanguage}
                                updateAlertedMessage={this.updateAlertedMessage.bind(this)}
                                updateVisibility={this.updateSentMultipleAlertsModalHandler.bind(this)}
                                selectedMessage={this.state.selectedMessageId}
                                selectedLink={this.state.selectedLink}
                            />
                        </div >
                        {!this.state.isLoading &&
                            <div className="discussion-col col-lg-6 col-md-12" >
                                <div
                                    id="presentGraph"
                                    className={(this.state.graph ? "show" : "") + " collapse graph row mb-1"} >
                                    {this.state.shownMessages.length > 0 &&
                                        <Graph
                                            nodes={this.state.shownNodes}
                                            links={this.state.shownLinks}
                                            currentUser={this.props.currentUser}
                                            updateSelectedUser={this.updateSelectedUserHandler.bind(this)}
                                            updateSelectedLink={this.updateSelectedLinkHandler.bind(this)}
                                            rootId={this.state.shownMessages[0]["author"]}
                                            handleHide={() => this.handleInsightVisibility('graph', false)}
                                            allowHide={this.props.userType !== 'USER'}
                                        />
                                    }
                                </div >
                                {(!this.state.graph && this.props.userType !== 'USER') && <a
                                    href="#presentGraph" data-toggle="collapse"
                                    onClick={() => this.handleInsightVisibility('graph', true)} ><h4 ><i
                                        className="fa fa-angle-up p-2" />Graph</h4 ></a >}
                                <div className="row insights" >
                                    {(this.state.statisticsUser || this.state.statisticsDiscussion) &&
                                        <div
                                            className="statistics col-lg-4 col-md-12 p-0 mr-1" >
                                            <span className={(this.state.statisticsUser ? "show" : "") + "collapse"} >
                                                <UserStats
                                                    className="stats"
                                                    id="presentStatUser"
                                                    getSelectedUser={this.getSelectedUser.bind(this)}
                                                    discussionId={this.state.discussionId}
                                                    getShownMessages={this.getShownMessages.bind(this)}
                                                    getShownLinks={this.getShownLinks.bind(this)}
                                                    getShownNodes={this.getShownNodes.bind(this)}
                                                    handleHide={() => this.handleInsightVisibility('statUser', false)}
                                                    allowHide={this.props.userType !== 'USER'}
                                                    isFull={!this.state.statisticsDiscussion}
                                                />
                                            </span >
                                            <span className={(this.state.statisticsDiscussion ? "show" : "") + "collapse"} >
                                                <DiscussionStats
                                                    className="stats"
                                                    id="presentStatDiscussion"
                                                    discussionId={this.state.discussionId}
                                                    getShownMessages={this.getShownMessages.bind(this)}
                                                    getShownLinks={this.getShownLinks.bind(this)}
                                                    getShownNodes={this.getShownNodes.bind(this)}
                                                    handleHide={() => this.handleInsightVisibility('statDiscussion', false)}
                                                    allowHide={this.props.userType !== 'USER'}
                                                    isFull={!this.state.statisticsUser}
                                                />
                                            </span>
                                        </div >

                                    }
                                    <div>
                                        {(!this.state.statisticsUser && this.props.userType !== 'USER') && <a
                                            href="#presentStatUser" data-toggle="collapse"
                                            onClick={() => this.handleInsightVisibility('statUser', true)} ><h4 ><i
                                                className="fa fa-angle-up p-2" />User Statistics</h4 ></a >}
                                        {(!this.state.statisticsDiscussion && this.props.userType !== 'USER') && <a
                                            href="#presentStatDiscussion" data-toggle="collapse"
                                            onClick={() => this.handleInsightVisibility('statDiscussion', true)} ><h4 ><i
                                                className="fa fa-angle-up p-2" />Discussion Statistics</h4 ></a >}
                                    </div>
                                    {(!this.state.alerts && this.props.userType !== 'USER') && <a
                                        href="#presentAlerts" data-toggle="collapse"
                                        onClick={() => this.handleInsightVisibility('alerts', true)} ><h4 ><i
                                            className="fa fa-angle-up p-2" />Alerts</h4 ></a >}
                                    <div
                                        id="presentAlerts"
                                        className={(this.state.alerts ? "show" : "") + " collapse col p-0 alerts"} >
                                        <AlertList
                                            alerts={this.state.shownAlerts} directionClass={this.state.directionClass}
                                            handleHide={() => this.handleInsightVisibility('alerts', false)}
                                            allowHide={this.props.userType !== 'USER'}
                                            handleClick={this.handleAlertClick}
                                        />
                                    </div >
                                </div >
                            </div >
                        }
                    </div >
                </React.Fragment >
            </div >
        );
    }
}

const mapStateToProps = (state) => {
    return {
        currentUser: state.currentUser,
        userType: state.userType,
        token: state.token,
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        onLogOut: () => dispatch({ type: "LOGOUT" }),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Discussion);
