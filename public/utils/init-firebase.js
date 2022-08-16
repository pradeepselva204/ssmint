
import {initializeApp} from 'firebase/app'
import {getAuth} from 'firebase/auth'
import {getFirestore} from '@firebase/firestore'
import { getStorage } from 'firebase/storage';
const firebaseConfig = {
    apiKey: "AIzaSyDOpzdXEPHrc4MQE8CJZRjPhduB5q39E4A",
    authDomain: "nftizen-d80c8.firebaseapp.com",
    projectId: "nftizen-d80c8",
    storageBucket: "nftizen-d80c8.appspot.com",
    messagingSenderId: "242103493177",
    appId: "1:242103493177:web:bb2cae72eaefa18ac023e8",
    measurementId: "G-9F54ZBHY9P"
  };

  const app = initializeApp(firebaseConfig)

  export const auth = getAuth(app)
  export const storage = getStorage()
  export const db = getFirestore(app)