
# Notification System with Firebase and React

This project is a simple notification system built with React and Firebase. It features real-time notifications and a UI for sending and viewing notifications.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (LTS version)
- npm (comes with Node.js)
- Git

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Cloning the Repository

To get started, clone the repository to your local machine:

```bash
git clone https://your-repository-url.git
cd path-to-your-project
```

### Environment Setup

1. **Configure Environment Variables:**
   - Rename the provided `.env.sample` file to `.env`.
   - Replace the placeholder values with your Firebase project configurations:

     ```plaintext
     REACT_APP_FIREBASE_API_KEY=your_api_key
     REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
     REACT_APP_FIREBASE_PROJECT_ID=your_project_id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
     REACT_APP_FIREBASE_APP_ID=your_app_id
     ```

### Installing Dependencies

Install all necessary dependencies to run the project:

```bash
npm install
```

### Running the Application

To start the application in development mode, run:

```bash
npm start
```

This will launch the app on `http://localhost:3000`. The app will automatically reload if you make edits to the source files.

## Firebase Emulators

To use Firebase emulators for development:

1. Install the Firebase CLI:

    ```bash
    npm install -g firebase-tools
    ```

2. Start the emulators:

    ```bash
    firebase emulators:start
    ```

Refer to the Firebase documentation for detailed setup instructions.

## Building the Application

To build the application for production:

```bash
npm run build
```

This command builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

## Contributing

Contributions are welcome. Please fork the repository and submit a pull request with your features or fixes.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
