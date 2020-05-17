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

    componentWillUnmount() {
        const data = {
            discussionId: this.state.discussionId,
            username: this.props.currentUser
        };
        this.socket.emit('leave', data);
    }

    setDefaultVisualConfig = (discussionVisualConfig, userVisualConfig) => {
        this.defaultConfig = discussionVisualConfig;
        if (this.props.userType === 'USER') {
            if (userVisualConfig) {
                this.setState({
                    graph: userVisualConfig['graph'],
                    alerts: userVisualConfig['alerts'],
                    statisticsUser: userVisualConfig['statisticsUser'],
                    statisticsDiscussion: userVisualConfig['statisticsDiscussion']
                });
            } else {
                this.setState({
                    graph: discussionVisualConfig['graph'],
                    alerts: discussionVisualConfig['alerts'],
                    statisticsUser: discussionVisualConfig['statisticsUser'],
                    statisticsDiscussion: discussionVisualConfig['statisticsDiscussion']
                });
            }
        }
    };

    setModeratorSettings = (element, toShow) => {
        this.setState({
            [element]: toShow,
        });
    };


    updateAlertedMessage = (message) => {
        this.setState({
            alertedMessage: message
        });
    };

    updateShownState(newMessages, newNodes, newLinks, newAlerts, lastMessage) {
        this.setState({
            shownMessages: newMessages,
            shownNodes: newNodes,
            shownLinks: newLinks,
            shownAlerts: newAlerts,
            lastMessage: lastMessage,
        });
    }

    updateSelectedUserHandler(username) {
        this.setState({ selectedUser: username });
    }

    updateSelectedLinkHandler = (link) => {
        // this.setState({ selectedLink: link });
    };

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

    handleShareClick = () => {
        let dummy = document.createElement("input");
        document.body.appendChild(dummy);
        dummy.setAttribute("value", this.state.discussionId);
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
    };

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

    getSelectedUser() {
        return this.state.selectedUser;
    }

    getShownMessages() {
        return this.state.shownMessages;
    }

    getShownLinks() {
        return this.state.shownLinks;
    }

    getShownNodes() {
        return this.state.shownNodes;
    }

    updateVisualConfigModalHandler = (isOpen) => {
        this.setState({
            showVisualizationSettingsModal: isOpen,
        });
    };

    updateSentMultipleAlertsModalHandler = (isOpen) => {
        this.setState({
            showSentMultipleAlertsModal: isOpen,
        });
    };


    handleEndSession = () => {
        const data = {
            token: this.props.token,
            discussionId: this.state.discussionId,
        };
        this.socket.emit("end_session", data);
    };

    handleNewConfig = (response) => {
        if (this.props.userType === 'USER') {
            for (let setting in response) {
                this.setState({ [setting]: response[setting] });
            }
        }
    };

    handleFinishLoading = () => {
        this.setState({ isLoading: false });
    };

    handleInsightVisibility = (insight, show) => {
        switch (insight) {
            case 'graph':
                this.setState({ graph: show });
                break;
            case 'alerts':
                this.setState({ alerts: show });
                break;
            case 'statUser':
                this.setState({ statisticsUser: show });
                break;
            case 'statDiscussion':
                this.setState({ statisticsDiscussion: show });
                break;
        }
    };

    handleAlertClick = (messageId) => {
        if (this.state.selectedMessageId === messageId) {
            this.setState({ selectedMessageId: null })
        } else {
            this.setState({ selectedMessageId: messageId });
        }
    };

    hashCode = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    };

    intToRGB = (i) => {
        const c = (this.hashCode(i) & 0x00ffffff).toString(16).toUpperCase();
        return "00000".substring(0, 6 - c.length) + c;
    };

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
                                    {(this.props.userType !== "USER" && this.props.isSimulation === "false") &&
                                        <React.Fragment >
                                            <button
                                                type="button" className="btn btn-danger endSession"
                                                onClick={this.handleEndSession} >
                                                End Session
                                        </button >
                                            <button
                                                className="btn multipleAlerts"
                                                onClick={() => this.updateSentMultipleAlertsModalHandler(true)} >
                                                <i className="far fa-bell mr-2" style={{ 'fontSize': '18px' }} /> Alert
                                                                                                              Users
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
                                            directionClass={this.state.directionClass}
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
