import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, doc, setDoc, getDoc } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch role from Firestore
  const fetchRole = async (uid) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserRole(docSnap.data().role);
      }
    } catch (error) {
      console.error("Error fetching role", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchRole(user.uid);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    setCurrentUser(userCredential.user);
    await fetchRole(userCredential.user.uid);
    return userCredential.user;
  };

  const signup = async (email, password, role, extraData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save to firestore
    await setDoc(doc(db, 'users', user.uid), {
      email,
      role,
      ...extraData,
      createdAt: new Date().toISOString()
    });
    
    setCurrentUser(user);
    setUserRole(role);
    return user;
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserRole(null);
  };

  const value = {
    currentUser,
    userRole,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
