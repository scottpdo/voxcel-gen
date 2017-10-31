// @flow

import React, { Component } from 'react';
import * as firebase from 'firebase';
import store from 'store';

import '../css/Chat.css';

type Props = {
  db: firebase.database,
  directory: Object,
  world: string
};

type State = {
  active: boolean,
  messages: Array<Object>
};

export default class Chat extends Component<Props, State> {

  dataRef: firebase.ref;
  onKeyup: Function;
  scrollToBottom: Function;
  toggle: Function;

  constructor() {

    super();

    this.state = {
      active: false,
      messages: []
    };

    this.onKeyup = this.onKeyup.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);    
    this.toggle = this.toggle.bind(this);
  }

  componentDidMount() {
    
    this.dataRef = this.props.db.ref('chats/' + this.props.world);
    
    this.dataRef.on('child_added', child => {

      const data = child.val();

      if (this.props.directory.get(data.user)) data.user = this.props.directory.get(data.user);

      this.setState({
        messages: this.state.messages.concat(data)
      }, this.scrollToBottom);
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

  scrollToBottom() {

    const messages = this.refs.chatMessages;
    const container = this.refs.chatMessagesContainer;

    container.scrollTop = 
      messages.clientHeight > container.clientHeight ?
      messages.clientHeight - container.clientHeight + 30 :
      0;
  }

  toggle() {
    this.setState({ active: !this.state.active }, this.scrollToBottom);
  }

  render() {

    const messages = this.state.messages.map((obj, i) => {
      return (
        <div key={"chat-message-" + i.toString()}>
          <p className="chat__name">{obj.user}</p>
          <p className="chat__message">{obj.message}</p>
        </div>
      );
    });

    let containerClass = "chat";
    if (this.state.active) containerClass += " chat--active";

    return (
      <div className={containerClass}>
        <div className="chat__bar" onClick={this.toggle}>Chat</div>
        <div className="chat__contents">
          <div className="chat__messages--container" ref="chatMessagesContainer">
            <div className="chat__messages" ref="chatMessages">
              {messages}
            </div>
          </div>
          <input ref="message" className="chat__input" placeholder="Your message..." />
        </div>
      </div>
    );
  }
};