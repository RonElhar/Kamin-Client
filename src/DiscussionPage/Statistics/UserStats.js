import React, { Component } from 'react';
import { connect } from 'react-redux'


class UserStats extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedUser: null,
            commentsWritten: 0,
            usersResponded: 0,
            commentsReceived: 0,
            repliedUsers: 0,
            wordsWritten: 0,
        }
    }

    /**
     * Calculate statistics.
     * @constructor
     */
    UNSAFE_componentWillReceiveProps() {
        this.calcUserStats();
    }

    /**
     * Calculate the user statistics according to its settings.
     * Update the state according to the current settings.
     */
    calcUserStats() {
        let commentsWritten = 0;
        let wordsNumber = 0;
        let usersResponded = 0;
        let commentsReceived = 0;
        let repliedUsers = 0;
        let selectedUser = this.props.getSelectedUser();
        this.props.getShownLinks().forEach(link => {
            if (link.source.id === selectedUser) {
                usersResponded++;
            }
            if (link.target.id === selectedUser) {
                repliedUsers++;
                commentsReceived += link.name;
            }
        });
        this.props.getShownMessages().forEach(message => {
            if (message.author === selectedUser) {
                commentsWritten++;
                wordsNumber += message.text.replace(/<(?<=<)(.*?)(?=>)>/g, ' ').replace('&nbsp;', '').split(' ').filter(word => word.length > 1).length;
            }
        });
        this.setState({
            selectedUser: selectedUser,
            commentsWritten: commentsWritten,
            usersResponded: usersResponded,
            commentsReceived: commentsReceived,
            repliedUsers: repliedUsers,
            wordsWritten: wordsNumber
        });
    };

    render() {
        return (
            <div className={(this.props.isFull ? "card-stats-full" : "card-stats-share") + " card small-font"} >
                <div className="card-header p-1" >
                    {this.props.allowHide ? <h4 className="Card-title" ><a href="#presentStatUser" data-toggle="collapse" onClick={this.props.handleHide}>
                        <i className="fa fa-angle-down" /></a>Statistics of {this.state.selectedUser} </h4 > : <h4 className="Card-title" > Statistics of {this.state.selectedUser} </h4 >
                    }
                </div >
                <div className="card-body p-1 table-wrap" >
                    <table className="mx-auto table table-sm" >
                        < tbody>
                            <tr className="row xs-2" >
                                <td className="col-8" >Comments Written:</td >
                                <td className="col " >{this.state.commentsWritten}</td >
                            </tr >
                            <tr className="row xs-2" >
                                <td className="col-8" >Responded Users:</td >
                                <td className="col" >{this.state.usersResponded}</td >
                            </tr >
                            <tr className="row xs-2" >
                                <td className="col-8" >Comments Received:</td >
                                <td className="col" >{this.state.commentsReceived}</td >
                            </tr >
                            <tr className="row xs-2" >
                                <td className="col-8" >Users Replied:</td >
                                <td className="col" >{this.state.repliedUsers}</td >
                            </tr >
                            <tr className="row xs-2" >
                                <td className="col-8" >Words Written:</td >
                                <td className="col" >{this.state.wordsWritten}</td >
                            </tr >
                        </ tbody>
                    </table >
                </div >
            </div >
        );
    }
}

const mapStateToProps = state => {
    return {
        currentUser: state.currentUser,
        userType: state.userType
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        onLogOut: () => dispatch({ type: 'LOGOUT' })
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(UserStats);
