import React, { Component } from 'react';
import Modal from 'react-bootstrap4-modal';
import { connect } from "react-redux";
import './MultipleUsersAlerts.css'

class MultipleUsersAlerts extends Component {
    constructor(props) {
        super(props);
        this.socket = this.props.socket;
        this.activeUsers = {};
        this.noUsers = '';
        this.state = {
            alertedUsers: {},
            alertedAll: false,
            userAlerted: false,
            alertText: '',
            error: ''
        }
    }

    componentDidMount() {
        this.socket.on("update active users", (response) => {
            const allUsers = response;
            if (Object.keys(allUsers).length > 0) {
                this.noUsers = 'Choose Users:';
                this.activeUsers = { 'all': false };
                Object.keys(allUsers).forEach(user => {
                    if (this.props.currentUser !== user) {
                        this.activeUsers[allUsers[user]] = false;
                    }
                });
            }
            else {
                this.noUsers = 'There are no users in discussion';
            }
        });
    }

    /**
     * Update the modal visibility.
     * Initialize the alerts flags.
     * @param isOpen - To show or to hide the modal.
     */
    updateVisibility = (isOpen) => {
        this.props.updateVisibility(isOpen);
        this.setState({ error: '' });
        this.setState({
            userAlerted: false,
            alertedAll: false,
        })
    };

    /**
     * Initialize the error message when the user enter a value.
     * Update state according to the user writing.
     * @param event - the event of writing an alert.
     */
    handleWriteAlert = (event) => {
        const alertText = event.target.value;
        this.setState({ error: '' });
        this.setState({
            alertText: alertText
        });
    };

    /**
     * In case the moderator chose to send the alert to all users- update all the checkboxes and the list of users.
     * In case the moderator chose to send the alert to part of the users- update the checkboxes of the chosen users
     * and add their username to the list of users.
     * @param event - the click of the user on the 'send' button.
     */
    updateIsUserAlerted = (event) => {
        let allUsers = this.activeUsers;
        if (event.target.name === 'all') {
            Object.keys(allUsers).forEach(user => {
                allUsers[user] = event.target.checked;
            });
            this.setState({
                activeUsers: allUsers,
                alertedAll: true
            });
        } else {
            allUsers[event.target.name] = event.target.checked;
            if (!event.target.checked) {
                allUsers['all'] = event.target.checked;
                this.setState({
                    activeUsers: allUsers
                });
            }
            this.setState({
                userAlerted: true
            });
        }
    };

    /**
     * Check the alert message validation- that there is a target (single user, some users or all the users), and that
     * the message is not empty.
     * @returns {boolean} - if the alert is validate or not.
     */

    validateFields = () => {
        if (!(this.state.userAlerted || this.state.alertedAll)) {
            this.setState({
                error: 'You must select users from the list.'
            });
            return false;
        }
        if (this.state.alertText.length === 0) {
            this.setState({
                error: 'Alert is required'
            });
            return false;
        }
        return true;
    };

    /**
     *
     * Create an object in the same structure as message.
     * The property extra_data contains a dictionary of the type of the list ('list' for single user or part of the
     * users, 'all' for sending the alert for all the users) and users list with flag if to alert them.
     * This function using the socketIO to notify the server on event of sending an alert.
     */

    sendAlert = () => {
        if (!this.validateFields()) return;
        let type = '';
        let alertComment = {};
        if (this.state.userAlerted) {
            type = 'list';
            let usersListSettings = {};
            for (let [user, toAlert] of Object.entries(this.activeUsers)) {
                if (user !== 'all' && toAlert === true) {
                    usersListSettings[user] = toAlert
                }
            }
            alertComment = {
                'extra_data': { recipients_type: type, users_list: usersListSettings }
            };
        } else if (this.state.alertedAll) {
            type = 'all';
            let allSettings = { all: this.activeUsers['all'] };
            alertComment = {
                'extra_data': { recipients_type: type, users_list: allSettings }
            };
        }
        Object.assign(alertComment, {
            'discussionId': this.props.discussionId,
            'author': this.props.currentUser,
            'text': this.state.alertText,
            'parentId': this.props.alertedMessage.id,
            'depth': this.props.alertedMessage.depth
        });
        if (this.state.userAlerted || this.state.alertedAll) {
            this.socket.emit('add alert', JSON.stringify(alertComment));
        }
        this.setState({
            alertText: ''
        });
        Object.keys(this.activeUsers).map(user => this.activeUsers[user] = false);
        this.updateVisibility(false);
    };

    render() {
        return (
            <Modal className="multipleUsersAlertsModal align-items-start" visible={this.props.isOpen} >
                <div className="modal-header" >
                    <h5 className="modal-title" >Send Alert</h5 >
                </div >
                <div className="modal-body modal-body-alerts" >
                    <p><b> {this.noUsers} </b></p>
                    <table className="table-alerts w-50" >
                        <tbody >
                            {Object.keys(this.activeUsers).map((id) =>
                                <tr id={id} key={id} >
                                    <td >
                                        <input
                                            name={id} type="checkbox"
                                            id={id + " alert"}
                                            className="alertUser"
                                            checked={this.activeUsers[id]}
                                            onChange={(event) => this.updateIsUserAlerted(event)}
                                        />
                                        <label htmlFor={id + " alert"} />
                                    </td >
                                    <td >{id}</td >
                                </tr >
                            )}
                        </tbody >
                    </table >
                    <div >
                        <p className="pt-3"><b> Write your alert here: </b></p>
                        <textarea
                            className={"description-input " + this.props.directionClass} name="description" value={this.state.alertText}
                            placeholder={"Write Something"} onChange={this.handleWriteAlert.bind(this)}
                        />
                        <div className="help-block text-danger" >{this.state.error}</div >
                    </div >
                </div >
                <div className="modal-footer" >
                    <button
                        type="button" className="btn btn-grey"
                        onClick={() => this.updateVisibility(false)} >Cancel
                    </button >
                    <button className="btn btn-info" onClick={this.sendAlert} >Send</button >
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

export default connect(mapStateToProps)(MultipleUsersAlerts);
