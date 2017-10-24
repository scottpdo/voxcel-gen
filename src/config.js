const config = {
  isDev: window.location.href.indexOf('localhost') > -1,
  firebase: {
    apiKey: "AIzaSyDt0NWpqCTqmDKCllvMj1E6XDn6Arycz9A",
    authDomain: "voxcel-gen.firebaseapp.com",
    databaseURL: "https://voxcel-gen.firebaseio.com",
    projectId: "voxcel-gen",
    storageBucket: "",
    messagingSenderId: "255409478423",
  },
  firebaseDev: {
    apiKey: "AIzaSyBDRqrM4UuP8rkxuKzR8IZptff2fGx45XE",
    authDomain: "worldmaking-dev.firebaseapp.com",
    databaseURL: "https://worldmaking-dev.firebaseio.com",
    projectId: "worldmaking-dev",
    storageBucket: "worldmaking-dev.appspot.com",
    messagingSenderId: "966441715800"
  }
};

export default config;