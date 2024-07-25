"use client";

import { useState, useEffect } from 'react';
import { auth } from '../../firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function Account() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/'); // Redirect to home page after logout
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <section className="relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="pt-32 pb-12 md:pt-40 md:pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="h1 mb-4">Welcome to Your Account</h1>
            <p className="text-xl text-gray-400">Hello, {user.email}!</p>
            <p className="mt-4">This is your personalized account page.</p>
            <button 
              onClick={handleLogout}
              className="btn text-white bg-purple-600 hover:bg-purple-700 mt-8"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}