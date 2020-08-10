import React, { Component, Fragment } from 'react';
import Modal from 'react-bootstrap4-modal';
import { connect } from "react-redux";
import './VisualizationsConfigModal.css'

class VisualizationsModal extends Component {
    constructor(props) {
        super(props);
        this.activeUsers = {};
        this.noUsers = 'There are no users in discussion';
        this.socket = props.socket;
        this.state = {
            configType: '',
            activeUsers: {},
            updateAll: false,
            updateUser: false,
        }
    }

    /**
     * Listen to the socket, to get a new visualization configuration notifications.
     */

    componentDidMount() {
        this.socket.on("new user config", (response) => {
            this.loadActiveUsers(response);
        })
    }

    /**
     * Load the configuration notifications of the active users.
     * In case there are active users, initial the 'all' option to true for all the elements.
     * For each active user - initial its configuration settings.
     * Uncheck the 'all' option for element which hide for one user or more.
     * @param configuration - dictionary of users names as keys and their configuration as value.
     */

    loadActiveUsers(configuration) {
        this.activeUsers = {};
        if (Object.keys(configuration).length > 0) {
            this.activeUsers['all'] = {
                graph: true,
                alerts: true,
                statisticsUser: true,
                statisticsDiscussion: true,
            };

            Object.keys(configuration).forEach(user => {
                if (this.props.currentUser !== user) {
                    let visualizations = ['graph', 'alerts', 'statisticsUser', 'statisticsDiscussion'];
                    this.activeUsers[user] = {
                        graph: configuration[user]['graph'],
                        alerts: configuration[user]['alerts'],
                        statisticsUser: configuration[user]['statisticsUser'],
                        statisticsDiscussion: configuration[user]['statisticsDiscussion']
                    };
                    visualizations.forEach(element => {
                        if (!configuration[user][element])
                            this.activeUsers['all'][element] = false;
                    });
                }
            });
        } else {
            this.noUsers = 'There are no users in discussion';
        }
    }

    /**
     * Update the visibility settings of the modal.
     * Initial the flag in state that represent change in users configurations.
     * @param isOpen - true to open the modal or false to close.
     */

    updateVisibility = (isOpen) => {
        this.props.updateVisibility(isOpen);
        this.setState({
            updateAll: false,
            updateUser: false
        })
    };


    /**
     * Update the chosen settings of the chosen users in case the moderator wants to update the setting of all the
     * users together or the settings of specific user.
     * Update the flag in state that shows there was a change, if relevant.
     * @param event - the event to update (check or uncheck)
     * @param type - the type of the element to show or hide.
     */
    updateUserVisualizations = (event, type) => {
        if (event.target.name === 'all') {
            Object.keys(this.activeUsers).forEach(user => {
                this.updateConfigInState(event, user, type);
            });
            this.setState({
                updateAll: true
            });
        } else {
            if (!event.target.checked) {
                let allSettings = this.activeUsers;
                allSettings['all'][type] = event.target.checked;
                this.setState({
                    activeUsers: allSettings
                });
            }
            this.updateConfigInState(event, event.target.name, type);
            this.setState({
                updateUser: true
            });
        }
    };

    /**
     * Update the visualization configuration of specific user.
     * @param event - the event to update (check or uncheck).
     * @param username - the username of the user to update its configurations.
     * @param type - the type of the element to show or hide.
     */
    updateConfigInState = (event, username, type) => {
        let allSettings = this.activeUsers;
        allSettings[username][type] = event.target.checked;
        this.setState({
            activeUsers: allSettings
        });
    };

    /**
     *
     * Create an object in the same structure as message.
     * The property extra_data contains a dictionary of the user and their new configurations.
     * parentId and depth represent the properties of the last message who sent in the discussion.
     * This function using the socketIO to notify the server on changes in the users settings.
     */
    updateConfig = () => {
        let type = '';
        let configComment = {};
        let usersList;
        if (this.state.updateUser) {
            type = 'list';
            usersList = {};
            for (let [user, config] of Object.entries(this.activeUsers)) {
                if (user !== 'all') {
                    usersList[user] = config
                }
            }
            configComment = {
                discussionId: this.props.discussionId,
                extra_data: {recipients_type: type, users_list: usersList}
            };
        } else if (this.state.updateAll) {
            type = 'all';
            usersList = {all: this.activeUsers['all']};
            configComment = {
                discussionId: this.props.discussionId,
                extra_data: {recipients_type: type, users_list: usersList}
            };
        }
        if (!this.props.isSimulation) {
            let text = '';
            for (const [user, actions] of Object.entries(usersList)) {
                text += `User : ${ user }, Action : ${ JSON.stringify(actions) }`;
            }
            Object.assign(configComment, {
                'author': this.props.currentUser,
                'text': text,
                'parentId': this.props.lastMessage.id,
                'depth': this.props.lastMessage.depth
            })
        }
        if (this.state.updateUser || this.state.updateAll) {
            this.socket.emit('change configuration', JSON.stringify(configComment));
        }
        this.updateVisibility(false);
    };

    render() {
        let colNames = ['username', 'Graph', 'User Statistics', 'Discussion Statistics', 'Alerts'];
        let elements = ['graph', 'statisticsUser', 'statisticsDiscussion', 'alerts'];
        let classNames = ['visModalGraph', 'visModalStatsUser', 'visModalStatsDiscussion', 'visModalAlerts'];
        return (
            <Modal className="visualModal align-items-start" visible={ this.props.isOpen } >
                <div className="modal-header" >
                    <h5 className="modal-title" >Visualization Management</h5 >
                </div >
                <div className="modal-body" >
                    { Object.keys(this.activeUsers).length > 0 ?
                        <table className="table" >
                            <thead >
                            <tr >
                                { colNames.forEach((col) => {
                                    return (<th >{ col }</th >)
                                }) }
                                <th >username</th >
                                <th >Graph</th >
                                <th >User Statistics</th >
                                <th >Discussion Statistics</th >
                                <th >Alerts</th >
                            </tr >
                            </thead >
                            <tbody >
                            { Object.keys(this.activeUsers).map((id, index) =>
                                <tr id={ id } key={ id } >
                                    <td >{ id }</td >
                                    { elements.map((element) => {
                                        return (
                                            <td >
                                                <input
                                                    name={ id } type="checkbox"
                                                    id={ id + " " + element }
                                                    className={ classNames[index] }
                                                    checked={ this.activeUsers[id][element] }
                                                    onChange={ (event) =>
                                                        this.updateUserVisualizations(event, element) } />
                                                <label htmlFor={ id + " " + element } />
                                            </td >
                                        )
                                    }) }
                                </tr >
                            ) }
                            </tbody >
                        </table >
                        : <p ><b > { this.noUsers } </b ></p >
                    }
                </div >
                <div className="modal-footer" >
                    <button
                        type="button" className="btn btn-grey"
                        onClick={ () => this.updateVisibility(false) } >Cancel
                    </button >
                    <button className="btn btn-info" onClick={ this.updateConfig } >OK</button >
                </div >
            </Modal >
        );
    }
}

const mapStateToProps = state => {
    return {
        currentUser: state.currentUser,
        token: state.token,
        userType: state.userType
    };
};

export default connect(mapStateToProps)(VisualizationsModal);
