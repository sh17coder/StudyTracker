// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBrgmv4m1Q0WKxmyBycshfg3S_FCi4GeLU",
  authDomain: "tracker-d18cf.firebaseapp.com",
  databaseURL: "https://tracker-d18cf-default-rtdb.firebaseio.com",
  projectId: "tracker-d18cf",
  storageBucket: "tracker-d18cf.firebasestorage.app",
  messagingSenderId: "750761378762",
  appId: "1:750761378762:web:a74a42a69211a1cf110533"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const database = firebase.database();
const auth = firebase.auth();

// Make them available globally
window.dbRef = database.ref();
window.auth = auth;
