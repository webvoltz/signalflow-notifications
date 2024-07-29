import React from "react";
import { sendNotification } from "../services/notificationService";

interface NotificationButtonProps {
    type: "info" | "alert" | "message";
}

/**
 * Button component for sending notifications based on type.
 */
const NotificationButton: React.FC<NotificationButtonProps> = ({ type }) => {
    /**
     * Handles the button click to send a notification.
     */
    const handleClick = () => {
        sendNotification(type);
    };

    return <button className="btn-primary" onClick={handleClick}>{`Send ${type}`}</button>;
};

export default NotificationButton;
