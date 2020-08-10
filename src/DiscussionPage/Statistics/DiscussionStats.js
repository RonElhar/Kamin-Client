import React, { Component } from 'react';
import { connect } from 'react-redux';

class DiscussionStats extends Component {
    constructor(props) {
        super(props);
        this.state = {
            participants: 0,
            comments: 0,
            repliedMost: "",
            receivedMost: ""
        }
    }

    /**
     * Calculate statistics according to the current state.
     */
    componentDidMount() {
        this.calcDiscussionStats();
    }

    /**
     * Calculate statistics when there is an update.
     * @constructor
     */
    UNSAFE_componentWillReceiveProps() {
        this.calcDiscussionStats();
    }

    /**
     * Calculate statistics according to the settings of the graph elements.
     */
    calcDiscussionStats() {
        let nodes = this.props.getShownNodes();
        if (nodes.length === 0) return;
        nodes.sort(function (a, b) { return b.comments - a.comments; });
        let maxComments = nodes[0].id;
        nodes.sort(function (a, b) { return b.commentsReceived - a.commentsReceived; });
        let maxReceivedComments = nodes[0].id;
        this.setState({
            participants: this.props.getShownNodes().length,
            comments: this.props.getShownMessages().length,
            repliedMost: maxComments,
            receivedMost: maxReceivedComments
        });
    }

    render() {
        return (
            <div className={(this.props.isFull ? "card-stats-full" : "card-stats-share") + " card small-font"} >
                <div className="card-header p-1" >
                    {this.props.allowHide ? <h4 className="Card-title" ><a href="#presentStatDiscussion" data-toggle="collapse" onClick={this.props.handleHide}>
                        <i className="fa fa-angle-down" /></a>Discussion Statistics </h4 > : <h4 className="Card-title" > Discussion Statistics </h4 >
                    }
                </div>
                <div className="card-body p-1 table-wrap" >
                    <table className="mx-auto table-sm table " >
                        < tbody>
                            <tr className="row xs-2" >
                                <td className="col-8" >Participants:</td >
                                <td className="col" >{this.state.participants}</td  >
                            </tr >
                            <tr className="row xs-2" >
                                <td className="col-8" >Comments:</td >
                                <td className="col" >{this.state.comments}</td >
                            </tr >
                            <tr className="row xs-2" >
                                <td className="col-8" >Replied Most Comments:</td >
                                <td className="col" >{this.state.repliedMost}</td >
                            </tr >
                            <tr className="row xs-2" >
                                <td className="col-8" >Received Most Comments:</td >
                                <td className="col" >{this.state.receivedMost}</td >
                            </tr >
                        </tbody>
                    </table >
                </div >
            </div >
        );
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        onLogOut: () => dispatch({ type: 'LOGOUT' })
    };
};

export default connect(null, mapDispatchToProps)(DiscussionStats);
