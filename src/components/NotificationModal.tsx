import React from "react";
import { Modal, Button } from "antd";
import { Notification } from "../App"; // Ensure this import matches your actual Notification type's location and definition.
import { DocumentData } from "firebase/firestore";

interface NotificationModalProps {
    visible: boolean;
    onClose: () => void;
    notification: Notification | null | DocumentData;
}

/**
 * Modal component to display notification details.
 */
const NotificationModal: React.FC<NotificationModalProps> = ({ visible, onClose, notification }) => {
    if (!notification) return null; // Return null if no notification data is available.

    /**
     * Formats the timestamp of the notification into a readable date string.
     */
    const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
        return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000).toLocaleString();
    };

    return (
        <Modal
            title="Notification Details"
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>Close</Button>,
            ]}
        >
            <p><strong>Type:</strong> {notification.type}</p>
            <p><strong>Message:</strong> {notification.message}</p>
            <p><strong>Timestamp:</strong> {formatDate(notification.timestamp)}</p>
        </Modal>
    );
};

export default NotificationModal;
