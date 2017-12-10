// @flow

import React, { Component } from 'react';
import WorldHistory from './WorldHistory';

import '../css/History.css';

type Props = {
  history: WorldHistory,
  play: Function,
  style: Object,
  update: Function
};

type State = {};

export default class HistoryControls extends Component<Props, State> {

  goto: Function;
  togglePaused: Function;

  constructor() {

    super();

    this.goto = this.goto.bind(this);
    this.togglePaused = this.togglePaused.bind(this);
  }

  goto(e: SyntheticEvent<HTMLInputElement>) {
    
    // $FlowFixMe
    const index = +e.target.value;
    const History = this.props.history;
    
    History.paused = true;

    History.goto(index);

    this.props.update();
  }

  togglePaused() {

    const History = this.props.history;

    History.paused = !History.paused;
    if (!History.paused) this.props.play();
    
    this.props.update();
  }

  render() {

    const History = this.props.history;

    return (
      <div className="history" style={this.props.style}>
        <div className="history__range__container">
          <input 
            className="history__range" 
            type="range" 
            min="0" 
            max={History.data.length} 
            step="1"
            value={History.index} 
            onChange={this.goto} />
        </div>
        <div className="history__controls">
          <label htmlFor="replaySpeed">Replay Speed:</label><br />
          <input 
            className="history__speed" 
            id="replaySpeed"
            type="range" min="20" max="500" 
            defaultValue={History.delay} 
            onChange={(e) => { History.delay = +e.target.value; }}/>
          <div 
            className={"history--playpause icon-" + (History.paused ? "play" : "pause")} 
            onClick={this.togglePaused}></div>
        </div>
      </div>
    )
  }
};