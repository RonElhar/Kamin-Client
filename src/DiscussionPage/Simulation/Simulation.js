import React, { Component } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import "./Simulation.css"
import { rgb } from "d3";
import { connect } from 'react-redux'
import io from 'socket.io-client';


class Simulation extends Component {

    constructor(props) {
        super(props);
        this.graphLinks = [];
        this.nodesMap = new Map();
        this.nodesChildren = new Map();
        this.messagesByTimestamp = [];
        this.timestampIndex = 1;
        this.currentMessageIndex = 1;
        this.allMessages = [];
        this.allNodes = [];
        this.allLinks = [];
        this.allAlerts = [];
        this.shownMessages = [];
        this.shownNodes = [];
        this.shownLinks = [];
        this.messagesCounter = 0;
        this.socket = io(process.env.REACT_APP_API);
    }

    componentDidMount() {
        this.socket.on('join room', (response) => {
            this.getMessagesNodesLinks(response["tree"]);
            this.props.setTitle(response["discussion"]["title"] + ": " + this.props.discussionId);
            this.nodesMap.set(this.allNodes[0].id, this.allNodes[0]);
            this.shownMessages = this.allMessages.slice(0, 1);
            this.shownNodes = this.allNodes.slice(0, 1);
            this.props.messagesHandler(this.shownMessages, this.shownNodes, this.shownLinks);
        });
        const data = {
            discussion_id: this.props.discussionId,
            token: this.props.token
        };
        this.socket.emit('join', data);
        this.socket.on('user joined', (response) => console.log(response))
    }

    getMessagesNodesLinks = (node) => {
        if (node == null) return;
        if (node["node"]["isAlerted"]) {
            this.props.alertsHandler({ "position": this.messagesCounter, "text": node["node"]["actions"][0] })
        }
        this.messagesCounter++;
        Object.assign(node["node"], { color: "#" + intToRGB(hashCode(node["node"]["author"])) });
        this.allMessages.push(node["node"]);
        this.allNodes.push({
            id: node["node"]["author"],
            color: node["node"]["color"],
            name: node["node"]["author"],
            timestamp: node["node"]["timestamp"],
            val: 0.5,
            updateVal: function (value) {
                this.val += value;
            },
        });
        node["children"].forEach(child => {
            let link = {
                source: child["node"]["author"],
                target: node["node"]["author"],
                messagesNumber: 1,
                width: 1,
                timestamp: node["node"]["timestamp"],
                color: rgb(32, 32, 32, 1),
                updateWidth: function (value) {
                    this.width = value;
                },
                updateMessagesNumber: function (value) {
                    this.messagesNumber += value;
                },
                updateOpacity: function (value) {
                    this.color = rgb(value[0], value[1], value[2], value[3]);
                },
            };
            this.allLinks.push(link);
            this.getMessagesNodesLinks(child);
        });
    };

    handleNextClick = () => {
        if (this.currentMessageIndex === this.allMessages.length) return;
        const nextMessage = this.allMessages[this.currentMessageIndex];
        const userName = nextMessage["author"];
        if (!this.nodesMap.has(userName))
            this.nodesMap.set(userName, this.allNodes.find(node => node.id === userName));
        const link = cloneDeep(this.allLinks[this.currentMessageIndex - 1]);
        const idx = this.graphLinks.findIndex(currentLink => currentLink !== null &&
            currentLink.source.id === link.source && currentLink.target.id === link.target);
        if (idx === -1) {
            this.graphLinks.unshift(link);
        } else {
            this.graphLinks[idx].updateMessagesNumber(1);
            let updatedLink = this.graphLinks.splice(this.graphLinks[idx], 1)[0];
            this.graphLinks.unshift(updatedLink);
        }
        this.updateOpacityAll();
        this.updateWidthAll();
        this.nodesMap.get(link.target).updateVal(0.02);
        this.update(1);
    };

    handleBackClick = () => {
        if (this.currentMessageIndex === 1) return;
        const messageIndex = this.currentMessageIndex - 1;
        const userName = this.allMessages[messageIndex]["author"];
        const links = this.allLinks.slice(0, messageIndex - 1);
        const nodes = this.allNodes.slice(0, messageIndex);
        const link = cloneDeep(this.allLinks[messageIndex - 1]);
        this.nodesMap.get(link.target).updateVal(-0.02);
        if (nodes.find(node => node.id === userName) == null)
            this.nodesMap.delete(userName);
        const linkIndex = links.findIndex(
            currentLink => currentLink.source === link.source && currentLink.target === link.target);
        const idx = this.graphLinks.findIndex(
            currentLink => currentLink.source.id === link.source && currentLink.target.id === link.target);
        if (linkIndex === -1) {
            this.graphLinks.splice(idx, 1);
        } else {
            this.graphLinks[idx].updateMessagesNumber(-1);
        }
        this.updateWidthAll();
        this.updateOpacityAll();
        this.update(-1);
    };

    handleSimulateClick = async () => {
        while (this.currentMessageIndex + 1 < this.allMessages.length) {
            await this.handleNextClick();
            await (async () => {
                await sleep(1000);
            })();
        }
    };

    handleShowAllClick = async () => {
        while (this.currentMessageIndex < this.allMessages.length) {
            await this.handleNextClick();
            await sleep(1);
        }
        this.props.messagesHandler(this.shownMessages, this.shownNodes, this.shownLinks);
    };

    handleResetClick = () => {
        while (this.currentMessageIndex !== 1) {
            this.handleBackClick();
        }
        this.props.messagesHandler(this.shownMessages, this.shownNodes, this.shownLinks);
    };


    render() {
        return (
            <div id="simulation pt-2 pb-0">
                <div className="row justify-content-around py-1" id="simulation-nav">
                    <button type="button" className="btn btn-primary btn-sm"
                        onClick={this.handleResetClick}>Reset
                    </button>
                    <button type="button" className="btn btn-primary btn-sm"
                        onClick={this.handleBackClick}>Back
                    </button>
                    <button type="button" className="btn btn-primary btn-sm"
                        onClick={this.handleNextClick}>Next
                    </button>
                    <button type="button" className="btn btn-primary btn-sm"
                        onClick={this.handleShowAllClick}>All
                    </button>
                    <button type="button" className="btn btn-primary btn-sm"
                        onClick={this.handleSimulateClick}>Simulate
                    </button>
                </div>
            </div>
        );
    }

    update(dif) {
        this.shownMessages = this.allMessages.slice(0, this.currentMessageIndex + dif);
        this.shownLinks = Array.from(this.graphLinks);
        this.shownNodes = Array.from(this.nodesMap.values());
        this.currentMessageIndex = this.currentMessageIndex + dif;
        this.props.messagesHandler(this.shownMessages, this.shownNodes, this.shownLinks);
    }

    updateOpacityAll() {
        this.graphLinks.forEach(link => {
            const index = this.graphLinks.indexOf(link);
            let newOpacity = (this.graphLinks.length - index) / this.graphLinks.length;
            link.updateOpacity([32, 32, 32, newOpacity]);
        });
    }

    updateWidthAll() {
        const allMessagesNumber = this.graphLinks.map(link => link.messagesNumber);
        const max = Math.max(...allMessagesNumber);
        this.graphLinks.forEach(link => {
            const value = link.messagesNumber;
            link.updateWidth((2 * (value - 1) / max) + 1);
        });
    }
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function intToRGB(i) {
    const c = (i & 0x00FFFFFF).toString(16).toUpperCase();
    return "00000".substring(0, 6 - c.length) + c;
}

const sleep = m => new Promise(r => setTimeout(r, m));

const mapStateToProps = state => {
    return {
        currentUser: state.currentUser,
        token: state.token
    };
};

export default connect(mapStateToProps)(Simulation);
