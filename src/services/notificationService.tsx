import { addDoc, collection, getDoc, updateDoc, DocumentReference } from "firebase/firestore";
import React, { useState } from "react";
import { db } from "../firebaseConfig";
import { toast } from "react-toastify";
import { Modal, Button } from "antd";

interface ToastifyNotificationProps {
    title: string;
    body: string;
    docRef: DocumentReference;
}

/**
 * Displays a notification with options to mark it as read.
 */
export const ToastifyNotification: React.FC<ToastifyNotificationProps> = ({ title, body, docRef }) => {
    const [isModalVisible, setIsModalVisible] = useState(false);

    /**
     * Handle click to show notification details and mark it as read.
     */
    const handleClick = async () => {
        setIsModalVisible(true);
        await markNotificationAsRead(docRef);
    };

    /**
     * Handle closing of the modal.
     */
    const handleOk = () => {
        setIsModalVisible(false);
        toast.dismiss();
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    /**
     * Marks notification as read and dismisses the toast.
     */
    const handleMarkAsRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await markNotificationAsRead(docRef);
        toast.dismiss();
    };

    return (
        <>
            <div className="push-notification" onClick={handleClick}>
                <h2 className="push-notification-title">{title}</h2>
                <p className="push-notification-text">{body}</p>
            </div>
            <Button onClick={handleMarkAsRead}>Mark as Read</Button>

            <Modal
                title="Notification Details"
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                footer={[
                    <Button key="ok" onClick={handleOk}>
                        OK
                    </Button>,
                ]}
            >
                <p><strong>Title:</strong> {title}</p>
                <p><strong>Message:</strong> {body}</p>
            </Modal>
        </>
    );
};

/**
 * Generates a random three-digit number.
 */
function generateRandom3DigitNumber(): number {
    return Math.floor(Math.random() * 900) + 100;
}

/**
 * Sends a notification of a given type and adds it to Firestore.
 */
export const sendNotification = async (type: string): Promise<void> => {
    try {
        const title = type === "info" ? "Info" : type === "alert" ? "Alert" : "Message";
        const randomDigits = generateRandom3DigitNumber();
        const docRef = await addDoc(collection(db, "notifications"), {
            type,
            message: `This is a sample ${title} text - ${randomDigits}`,
            read: false,
            timestamp: new Date(),
        });

        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            toast(
                <ToastifyNotification
                    title={`New ${title}`}
                    body={data.message}
                    docRef={docRef}
                />,
            );
        }
    } catch (e) {
        console.error("Error adding document: ", e);
    }
};

/**
 * Marks a notification as read in Firestore.
 */
export const markNotificationAsRead = async (docRef: DocumentReference): Promise<void> => {
    try {
        await updateDoc(docRef, {
            read: true,
        });
    } catch (e) {
        console.error("Error updating document: ", e);
    }
};
