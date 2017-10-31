// @flow

import React, { Component } from 'react';
import * as firebase from 'firebase';
import store from 'store';

import '../css/Chat.css';

type Props = {
  db: firebase.database,
  world: string
};

type State = {
  messages: Array<string>
};

export default class Chat extends Component<Props, State> {

  dataRef: firebase.ref;
  onKeyup: Function;

  constructor() {
    super();
    this.state = {
      messages: []
    };

    this.onKeyup = this.onKeyup.bind(this);
  }

  componentDidMount() {
    
    this.dataRef = this.props.db.ref('chats/' + this.props.world);
    
    this.dataRef.on('child_added', child => {
      
      const messages = this.state.messages;
      
      const data = child.val();
      const message = data.message;
      const user = data.user;

      this.setState({
        messages: messages.concat(message)
      });
    });

    this.refs.message.addEventListener('keyup', this.onKeyup);
  }

  componentWillUnmount() {
    this.dataRef.off();
    this.refs.message.removeEventListener('keyup', this.onKeyup);
  }

  onKeyup(e: KeyboardEvent) {
    if (e.keyCode !== 13) return;
    // 13 = enter = submit

    const user = store.get('user.id');
    const message = this.refs.message.value;

    this.dataRef.push({ user, message }, () => {
      this.refs.message.value = "";
    });
  }

  render() {

    const messages = this.state.messages.map((message, i) => {
      return <p key={i}>{message}</p>
    });

    return (
      <div className="chat">
        {messages}
        <input ref="message" />
      </div>
    );
  }
};