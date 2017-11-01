import React, { Component } from 'react';

export default class Instructions extends Component {
  render() {

    const style = {
      maxWidth: 800,
      padding: 40
    };

    return (
      <div style={style}>
        <h1>Instructions</h1>
        <p>Worldmaking works best on Mac OS X 10.10.5 (Yosemite) running Chrome >61.0.3163 or Firefox >56.0. It has not been tested in other operating systems or browsers.</p>
        <p>Add a new world from the main screen or join an existing one.</p>
        <p><b>Click</b> to add a voxel to the world. You can also <b>shift + click</b> to remove a voxel.</p>
        <p><b>Click and drag</b> to rotate the camera. <b>Right-click and drag</b> to pan.</p>
        <p>In the controls on the left, you can change the color, or choose a color from an object in the world.</p>
        <p>You can also switch between adding voxels and adding spheres to the world.</p>
        <p>Click <b>View History</b> to replay the world's construction in the order the objects were added. Toggle <b>View By Player</b> on or off to see objects colored by the player who added them to the world.</p>
        <p>Questions? Feedback? Let me know: <a href="mailto:scott.p.donaldson@gmail.com">scott.p.donaldson@gmail.com</a></p>
      </div>
    );
  }
};