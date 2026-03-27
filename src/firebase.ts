import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signIn = async () => {
	try {
		return await signInWithPopup(auth, googleProvider);
	} catch (error: any) {
		if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
			return signInWithRedirect(auth, googleProvider);
		}
		throw error;
	}
};
export const logOut = () => signOut(auth);
