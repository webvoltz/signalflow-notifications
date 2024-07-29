import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import NotificationButton from './components/NotificationButton';
import NotificationTable from './components/NotificationTable';
import { ToastContainer } from 'react-toastify';
import './App.css';

export interface Notification {
    id: string;
    type: string;
    message: string;
    read: boolean;
    timestamp: {
        seconds: number;
        nanoseconds: number;
    };
}

const App: React.FC = () => {
    const [data, setData] = useState<Notification[]>([]);

    /**
     * Effect to subscribe to the notifications collection on Firestore.
     * Automatically unsubscribes on component unmount.
     */
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'notifications'), (snapshot) => {
          const notifications: Notification[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Notification, 'id'>) // Explicitly omit 'id' from data if it exists
          }));
        
          setData(notifications);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="App">
            <header className="App-header">
                {/* Buttons for sending different types of notifications */}
                <NotificationButton type="info" />
                <NotificationButton type="alert" />
                <NotificationButton type="message" />
            </header>

            {/* Toast container to display notifications */}
            <ToastContainer />

            {/* Table to display notification data */}
            <div className="notification-table">
                <NotificationTable data={data} />
            </div>
        </div>
    );
};

export default App;
