import React, { Component } from 'react';
import { rgb } from "d3";
import { connect } from 'react-redux'
import Switch from 'react-switch'
import './Simulation.css';

class Simulation extends Component {

    constructor(props) {
        super(props);
        this.nodesChildren = new Map();
        this.currentMessageIndex = 1;
        this.allMessages = [];
        this.regularMessages = [];
        this.chronologicMessages = [];
        this.shownAlerts = [];
        this.shownMessages = [];
        this.shownNodes = [];
        this.shownLinks = [];
        this.messagesCounter = 0;
        this.socket = props.socket;
        this.state = {
            isChronological: true,
            selfControl: false
        }
    }

    /**
     * When the component is created, an event listener is also created by using the socket.
     * As a response to the event, a dictionary of the discussion details are received from the server.
     * The dictionary contains details such as the messages in the discussion, the title of the discussion, and default
     * settings that were defined by the moderator while the discussion was created.
     * The discussion is created and presents to the user according to the given details and given settings.
     * It also send the server an event of user joined to the chat room and its token.
     */
    componentDidMount() {
        this.socket.on('join room', async (response) => {
            if (this.allMessages.length === 0) {
                this.props.setTitle(response["discussionDict"]["discussion"]["title"]);
                this.loadMessages(response["discussionDict"]["tree"], 0, 1);
                this.chronologicMessages.sort(function (a, b) {
                    return a.timestamp - b.timestamp;
                });
                if (response.simulationOrder === "regular") {
                    await this.setState({ isChronological: false });
                    this.allMessages = [...this.regularMessages];
                } else {
                    this.allMessages = [...this.chronologicMessages];
                }
                this.shownMessages = this.allMessages.slice(0, 1);
                this.nodesChildren.set(this.shownMessages[0].id, []);
                this.shownNodes.push({
                    id: this.shownMessages[0].author,
                    color: "#" + this.props.nodeColor(this.shownMessages[0].author),
                    name: this.shownMessages[0].author,
                    val: 0.5,
                    comments: 1,
                    commentsReceived: 0
                });
                const language = response.discussionDict.discussion.configuration.language;
                if (language) {
                    this.props.updateLanguage(language);
                }
                this.props.updateShownState(this.shownMessages, this.shownNodes, this.shownLinks, this.shownLinks);
                this.props.updateVisualConfig(response['discussionDict']['discussion']['configuration']['vis_config'],
                    response['visualConfig']['configuration']);
                while (this.currentMessageIndex < response["currentIndex"]) {
                    this.handleNextClick(false);
                }
                this.props.updateShownState(this.shownMessages, this.shownNodes, this.shownLinks, this.shownAlerts);
                if (response.selfControl === "on") {
                    await this.setState({ selfControl: true })
                }
                this.props.handleFinishLoading();
            }
        });
        const data = {
            discussion_id: this.props.discussionId,
            token: this.props.token
        };
        this.socket.emit('join', data);
        this.handleModeratorActions();
    }

    /**
     * A recursive function that load all the messages in the discussion from the tree object to the relevant structures.
     * @param commentNode - object of the current node.
     * @param childIdx - the index of the next node object.
     * @param branchId - the id of the message's branch.
     */
    loadMessages = (commentNode, childIdx, branchId) => {
        if (commentNode == null) return;
        this.messagesCounter++;
        let parentUserName = '';
        if (commentNode["node"].parentId !== null)
            parentUserName = this.regularMessages.find(message => message.id === commentNode["node"].parentId).author;
        commentNode["node"].branchId = (commentNode["node"]["depth"] > 0 ? branchId + '.' + childIdx : '1');
        commentNode["node"].color = "#" + this.props.nodeColor(commentNode["node"]["author"]);
        commentNode["node"].numOfChildren = commentNode["children"].length;
        commentNode["node"].parentUsername = parentUserName;
        this.regularMessages.push(commentNode["node"]);
        this.chronologicMessages.push(commentNode["node"]);
        let i = 0;
        commentNode["children"].forEach(child => {
            this.loadMessages(child, i, commentNode["node"].branchId);
            i += 1;
        });
    };

    /**
     * This function is used for cases the moderator did any change in the discussion.
     * It Listen to the server events that present the possible changes in Simulation.
     */

    handleModeratorActions = () => {
        this.socket.on('next', () => { this.handleNextClick(true) });
        this.socket.on('back', () => { this.handleBackClick(true) });
        this.socket.on('reset', this.handleResetClick);
        this.socket.on('all', this.handleShowAllClick);
        this.socket.on('change_simulation_order', this.handleOrderSettings);
        this.socket.on('change_simulation_control', this.handleSelfControl);
    };

    /**
     * This function is used for moderators only, in order to notify the server that the moderator made a change.
     * @param type - The user type
     */

    handleNavigationClickModerator = (type) => {
        if (this.props.userType !== 'USER') {
            const data = { "discussionId": this.props.discussionId };
            this.socket.emit(type, data);
        }
    };

    /**
     * The below two functions are used for the case that the moderator press on the 'next' / 'back' buttons, correspondingly.
     * It distinct between the type of the message - chat message or alert.
     * Self message means that the user responded himself, we don't react to this event in the graph, so if it's not the
     * case- update the relevant graph structures so that the graph elements will be synchronized with the messages
     * appearance.
     * @param toUpdateState - If to update the state or not.
     */

    handleNextClick = (toUpdateState) => {
        if (this.currentMessageIndex === this.allMessages.length) return;
        const nextMessage = this.allMessages[this.currentMessageIndex];
        if (nextMessage["comment_type"] !== "comment") {
            this.shownAlerts.push(nextMessage);
            this.update(1, toUpdateState);
            return;
        }
        const userName = nextMessage.author;
        const parentId = nextMessage.parentId;
        const parentUserName = this.shownMessages.find(message => message.id === parentId).author;
        const selfMessage = (userName === parentUserName);
        if (this.state.isChronological) {
            this.nextByTimestamp(nextMessage, selfMessage)
        }
        else {
            this.shownMessages = this.allMessages.slice(0, this.currentMessageIndex + 1);
            this.shownMessages = this.shownMessages.filter(msg => msg["comment_type"] === "comment");
        }
        if (selfMessage) {
            this.update(1, toUpdateState);
            return;
        }
        this.updateNodesNext(userName, parentUserName);
        this.updateLinksNext(userName, parentUserName);
        this.update(1, toUpdateState);
    };


    handleBackClick = (toUpdateState) => {
        if (this.currentMessageIndex === 1) return;
        const messageIndex = this.currentMessageIndex - 1;
        let deletedMessage = this.allMessages[messageIndex];
        if (deletedMessage["comment_type"] !== "comment") {
            this.shownAlerts.pop();
            this.update(-1, toUpdateState);
            return;
        }
        const userName = deletedMessage.author;
        const parentId = deletedMessage.parentId;
        const parentUserName = this.shownMessages.find(message => message.id === parentId).author;
        const selfMessage = (userName === parentUserName);
        if (this.state.isChronological) {
            this.backByTimestamp(messageIndex)
        } else {
            this.shownMessages = this.allMessages.slice(0, this.currentMessageIndex - 1);
            this.shownMessages = this.shownMessages.filter(msg => msg["comment_type"] === "comment");
        }
        if (selfMessage) {
            this.update(-1, toUpdateState);
            return;
        }
        this.updateLinksBack(userName, parentUserName);
        this.updateNodesBack(userName, parentUserName);
        this.update(-1, toUpdateState);
    };


    /**
     *  Each node has an array of the ids of its children.
     *  Once the user press next, the function add the message to the children array of the parent of the author,
     *  add new element of the node (author).
     *  If the parent there are no children yet, the node will be add directly to the array, otherwise, the function
     *  will look for the last child (message) of its parent and will add this child after it.
     * @param nextMessage - The id of the next message that will appears in the chat.
     */

    nextByTimestamp = (nextMessage) => {
        const parentId = nextMessage.parentId;
        const parentIndex = this.shownMessages.findIndex(message => message.id === parentId);
        let children = this.nodesChildren.get(parentId);
        if (children.length === 0)
            this.shownMessages.splice(parentIndex + 1, 0, nextMessage);
        else {
            const lastChildId = children[children.length - 1];
            let prevMessageIndex = this.shownMessages.findIndex(message => message.id === lastChildId);
            while (prevMessageIndex + 1 < this.shownMessages.length &&
                this.shownMessages[prevMessageIndex + 1].depth > nextMessage.depth) {
                prevMessageIndex++;
            }
            this.shownMessages.splice(prevMessageIndex + 1, 0, nextMessage);
        }
        children.push(nextMessage.id);
        this.nodesChildren.set(parentId, children);
        this.nodesChildren.set(nextMessage.id, []);
    };


    /**
     * Add the link object to the presented links array, or update the relevant properties of exist link.
     * Update the width and the opacity of all the links in the graph.
     *
     * properties:
     * name - represents the messages number (also the tooltip)
     * width - represent the
     * color - represents the updating of the last message
     * @param userName - the username of the sender.
     * @param parentUserName - the username of the responded user.
     */
    updateLinksNext = (userName, parentUserName) => {
        const idx = this.shownLinks.findIndex(currentLink =>
            currentLink.source.id === userName && currentLink.target.id === parentUserName);
        if (idx === -1) {
            this.shownLinks.push({
                source: this.shownNodes.filter(node => node.id === userName)[0],
                target: this.shownNodes.filter(node => node.id === parentUserName)[0],
                name: 1,
                width: 1,
                color: rgb(32, 32, 32, 1),
                curvature: 0.2,
            })
        } else {
            this.shownLinks[idx].name = this.shownLinks[idx].name + 1;
            let updatedLink = this.shownLinks.splice(this.shownLinks[idx], 1);
            this.shownLinks.unshift(updatedLink[0]);
        }
        this.updateOpacityAll();
        this.updateWidthAll();
    };


    /**
     * Update the messages number while hover on link.
     * Update the array of current presented links in graph, if necessary.
     * Update the width and the opacity of all the links in the graph.
     * @param userName - the username of the sender.
     * @param parentUserName - the username of the responded user.
     */
    updateLinksBack = (userName, parentUserName) => {
        const linkIndex = this.shownLinks.findIndex(
            currentLink => currentLink.source.id === userName && currentLink.target.id === parentUserName);
        this.shownLinks[linkIndex].name -= 1;
        if (this.shownLinks[linkIndex].name === 0)
            this.shownLinks.splice(linkIndex, 1);
        this.updateWidthAll();
        this.updateOpacityAll();
    };


    /**
     * Add the node object to the presented nodes array, or update the relevant properties of exist node.
     * Update the relevant counters for the statistics calculations.
     *
     * @param userName - the username of the sender.
     * @param parentUserName - the username of the responded user.
     */
    updateNodesNext = (userName, parentUserName) => {
        const idx = this.shownNodes.findIndex(currentNode =>
            currentNode.id === userName);
        if (idx === -1) {
            this.shownNodes.push({
                id: userName,
                color: "#" + this.props.nodeColor(userName),
                name: userName,
                val: 0.5,
                children: [],
                comments: 1,
                commentsReceived: 0
            })
        } else {
            this.shownNodes[idx].val += 0.05;
            this.shownNodes[idx].comments++;
        }
        const parentIdx = this.shownNodes.findIndex(currentNode =>
            currentNode.id === parentUserName);
        this.shownNodes[parentIdx].commentsReceived++;
    };

    /**
     * Update the array of current presented nodes in graph, if necessary.
     * Update the relevant counters for the statistics calculations.
     * @param userName - the username of the sender.
     * @param parentUserName - the username of the responded user.
     */
    updateNodesBack = (userName, parentUserName) => {
        const linkIndex = this.shownLinks.findIndex(link => link.source.id === userName || link.target.id === userName);
        if (linkIndex === -1 && this.shownNodes.length > 1)
            this.shownNodes.splice(this.shownNodes.findIndex(node => node.id === userName), 1);
        else {
            const nodeIndex = this.shownNodes.findIndex(node => node.id === userName);
            this.shownNodes[nodeIndex].val -= 0.05;
            this.shownNodes[nodeIndex].comments--;
        }
        const parentIdx = this.shownNodes.findIndex(currentNode =>
            currentNode.id === parentUserName);
        this.shownNodes[parentIdx].commentsReceived--;
    };

    /**
     * This function is used for cases the default settings of the discussion are include a chronological order of
     * messages in the chat.
     * Remove the last message to display from the messages array.
     * @param messageIndex - the index of the last message in the array messages.
     */
    backByTimestamp = (messageIndex) => {
        const parentId = this.allMessages[messageIndex].parentId;
        let children = this.nodesChildren.get(parentId);
        children.splice(children.length - 1, 1);
        this.nodesChildren.set(parentId, children);

        const indexToDelete = this.shownMessages.findIndex(node => node.id === this.allMessages[messageIndex].id);
        this.shownMessages.splice(indexToDelete, 1);
    };

    /**
     * This function is used for the case that the moderator press on the 'All' button.
     * All the messages in the discussion will be displayed - both chat messages and alerts.
     */
    handleShowAllClick = () => {
        while (this.currentMessageIndex < this.allMessages.length) {
            this.handleNextClick(false);
        }
        this.props.updateShownState(this.shownMessages, this.shownNodes, this.shownLinks, this.shownAlerts);
    };

    /**
     * This function is used for the case that the moderator press on the 'Reset' button.
     * All the messages in the discussion will be disappeared - both chat messages and alerts.
     */
    handleResetClick = () => {
        while (this.currentMessageIndex !== 1) {
            this.handleBackClick(false);
        }
        this.props.updateShownState(this.shownMessages, this.shownNodes, this.shownLinks, this.shownAlerts);
    };

    /**
     * This function is used for the case that the discussion order setting is changed (by the moderator or the user
     * itself). It resets the discussion and load the relevant messages structure.
     */
    handleOrderSettings = () => {
        this.handleResetClick();
        this.setState((prevState) => ({
            isChronological: !prevState.isChronological,
        }), () => {
            this.state.isChronological ?
                this.allMessages = [...this.chronologicMessages] : this.allMessages = [...this.regularMessages];
        });

    };

    /**
     * This function is used for the case that the moderator allows a self control of the regular users in the
     * discussion. It resets the discussion.
     */
    handleSelfControl = () => {
        this.setState((prevState) => ({
            selfControl: !prevState.selfControl,
        }), () => {
            if (!this.state.selfControl) {
                this.handleResetClick();
            }
        });

    };

    /**
     *
     * @param dif - the difference from the current message index. positive value will increase the messages index,
     * while negative value will decrease it.
     * @param toUpdateState - If to update the props (Discussion) state
     */
    update(dif, toUpdateState) {
        this.currentMessageIndex = this.currentMessageIndex + dif;
        if (toUpdateState) {
            this.props.updateShownState(this.shownMessages, this.shownNodes, this.shownLinks, this.shownAlerts);
        }
    };

    /**
     * Update the opacity of all the links. The opacity will be determined by the updating of the message, while darker
     * color will be given to the newest message.
     */
    updateOpacityAll() {
        for (let index = 0; index < this.shownLinks.length; index++) {
            let newOpacity = Math.pow(index, 3) / Math.pow(this.shownLinks.length - 1, 3);
            if (newOpacity < 0.2) {
                newOpacity = 0.2
            }
            this.shownLinks[index].color = rgb(32, 32, 32, newOpacity);
        }
    };

    /**
     * Update the width of all the links. The width will be determined by the messages number between the users,
     * while a thicker width will be given to a larger number of messages between the users.
     */
    updateWidthAll() {
        const allMessagesNumber = this.shownLinks.map(link => link.name);
        const max = Math.max(...allMessagesNumber);
        for (let index = 0; index < this.shownLinks.length; index++) {
            const value = this.shownLinks[index].name;
            this.shownLinks[index].width = (2 * (value - 1) / max) + 1;
        }
    };

    render() {
        return (
            <React.Fragment>
                {!this.props.isLoading ? <React.Fragment >
                    {(this.props.userType === "MODERATOR" || this.props.userType === "ROOT" || this.state.selfControl) &&
                        <div className={"row"} >
                            <button
                                type="button" className="btn btn-primary btn-sm"
                                onClick={() => { this.state.selfControl ? this.handleResetClick() : this.handleNavigationClickModerator("reset") }} >Reset
                            </button >
                            <button
                                type="button" className="btn btn-primary btn-sm"
                                onClick={() => { this.state.selfControl ? this.handleBackClick(true) : this.handleNavigationClickModerator("back") }} >Back
                            </button >
                            <button
                                type="button" className="btn btn-primary btn-sm"
                                onClick={() => { this.state.selfControl ? this.handleNextClick(true) : this.handleNavigationClickModerator("next") }} >Next
                            </button >
                            <button
                                type="button" className="btn btn-primary btn-sm"
                                onClick={() => { this.state.selfControl ? this.handleShowAllClick() : this.handleNavigationClickModerator("all") }} >All
                            </button >
                            <div data-tip={'Press here to change to ' + (!this.state.isChronological ? 'Chronological' : 'Regular') + ' order.'} >
                                <Switch
                                    className="commentsOrderToggle"
                                    onChange={() => { this.state.selfControl ? this.handleOrderSettings() : this.handleNavigationClickModerator("change_simulation_order") }}
                                    checked={this.state.isChronological}
                                    offColor="#4285f4"
                                    onColor="#4285f4"
                                />
                                <span ><b >{(this.state.isChronological ? 'Chronological' : 'Regular')}</b ></span >
                            </div >
                            {this.props.userType !== "USER" &&
                                <div className="pl-2" data-tip={'Press here to change to ' + (!this.state.selfControl ? 'Controll All' : 'Self Control')} >
                                    <Switch
                                        className="commentsOrderToggle"
                                        onChange={() => { this.handleNavigationClickModerator("self control change"); }}
                                        checked={this.state.selfControl}
                                        offColor="#4285f4"
                                        onColor="#4285f4"
                                    />
                                    <span ><b >Self Control</b ></span >
                                </div >
                            }
                        </div >
                    }
                </React.Fragment > : null}
            </React.Fragment>
        );
    };
}

const mapStateToProps = state => {
    return {
        currentUser: state.currentUser,
        userType: state.userType,
        token: state.token
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        onLogOut: () => dispatch({ type: 'LOGOUT' })
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Simulation);
