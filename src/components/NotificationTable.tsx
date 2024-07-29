import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Notification } from '../App'; // Make sure this import reflects the actual location and structure.
import { Table, Button, Tag } from 'antd';
import NotificationModal from './NotificationModal';

interface NotificationTableProps {
    data: Notification[];
}

/**
 * Component to render a table of notifications with functionality to view and mark notifications as read.
 */
const NotificationTable: React.FC<NotificationTableProps> = ({ data }) => {
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    /**
     * Handles opening the modal for a specific notification and marking it as read.
     */
    const openModal = async (notification: Notification) => {
        setSelectedNotification(notification);
        setModalVisible(true);

        // Mark notification as read in Firestore
        const notificationDocRef = doc(db, 'notifications', notification.id);
        await updateDoc(notificationDocRef, { read: true });
    };

    /**
     * Handles closing the modal.
     */
    const closeModal = () => {
        setModalVisible(false);
        setSelectedNotification(null);
    };

    /**
     * Table column configuration.
     */
    const columns = [
        {
            title: 'Message',
            dataIndex: 'message',
            key: 'message',
            render: (text: string, record: Notification) => (
                <>
                    {text}
                    {!record.read && <Tag color="red" style={{ marginLeft: 8 }}>New</Tag>}
                </>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
        },
        {
            title: 'Read',
            dataIndex: 'read',
            key: 'read',
            render: (read: boolean) => <Tag color={read ? 'green' : 'volcano'}>{read ? 'Yes' : 'No'}</Tag>,
        },
        {
            title: 'Time',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (timestamp: { seconds: number; nanoseconds: number }) => 
                new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000).toLocaleString(),
        },
        {
            title: 'Action',
            key: 'action',
			render: (_: Notification, record: Notification) => <Button onClick={() => openModal(record)}>View</Button>,
        },
    ];

	// Use useMemo to sort data only when it changes
	const sortedData = useMemo(() => {
		return data.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
	}, [data]);

    return (
        <>
			<h1>Notifications</h1>
            <Table dataSource={sortedData } columns={columns} rowKey="id" />
            {selectedNotification && (
                <NotificationModal
                    visible={modalVisible}
                    onClose={closeModal}
                    notification={selectedNotification}
                />
            )}
        </>
    );
};

export default NotificationTable;
