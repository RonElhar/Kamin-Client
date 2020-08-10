import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Link } from "react-router-dom";
import './NavigationBar.css';
import bguLogo from '../bgulogo.png';

class NavigationBar extends Component {

    render() {
        return (
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary py-1 sticky-top" >
                <div className="container-fluid px-5" >
                    <img className="mr-3" src={bguLogo} alt="bgulogo" width={30} height={30} />
                    <Link className="navbar-brand" to={'/'} ><i className="fas fa-dungeon pr-2" />conversAction</Link >
                    <button
                        className="navbar-toggler" type="button" data-toggle="collapse"
                        data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
                        aria-expanded="false" aria-label="Toggle navigation" >
                        <span className="navbar-toggler-icon" />
                    </button >
                    <div className="collapse navbar-collapse" id="navbarSupportedContent" >
                        <ul className="navbar-nav mr-auto" >
                            <li className="nav-item" >
                                <Link className="nav-link" to={'/'} >Home </Link >
                            </li >
                        </ul >
                        {this.props.currentUser ?
                            <ul className="navbar-nav ml-auto" >
                                <li className="nav-item" >
                                    <Link className="nav-link" to={'/'} >Welcome, {this.props.currentUser}!</Link >
                                </li >
                                <li className="nav-item" onClick={this.props.onLogOut} >
                                    <Link className="nav-link" to={'/'} >
                                        <i className="fas fa-sign-out-alt pr-2" />Log Out
                                    </Link >
                                </li >
                            </ul >
                            : <ul className="navbar-nav ml-auto" >
                                <li className="nav-item" >
                                    <Link className="nav-link" to={'/login'} >
                                        <i className="fas fa-sign-in-alt pr-2" />Sign In
                                    </Link >
                                </li >
                                <li className="nav-item" >
                                    <Link className="nav-link" to={'/registration'} >
                                        <i className="fas fa-user-plus pr-2" />Sign Up
                                    </Link >
                                </li >
                            </ul >}
                    </div >
                </div >
            </nav >
        );
    };
}

const mapStateToProps = state => {
    return {
        currentUser: state.currentUser
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        onLogOut: () => dispatch({ type: 'LOGOUT' })
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(NavigationBar);
