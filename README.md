# storeflex

## Connecting Your Own Firebase and Gemini Credentials

To connect this application to your own Firebase project and use your own Gemini API key for AI features, please follow these steps.

### 1. Set up Firebase

First, you'll need a Firebase project to act as the backend for your application, storing all your inventory, sales, and user data.

1.  **Create a Firebase Project**: If you don't have one already, go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Enable Firestore**: In your new project's dashboard, go to the "Build" section in the left sidebar and click on "Firestore Database". Click "Create database" and start in **production mode**. Choose a location closest to your users.
3.  **Create a Web App**:
    *   Go to your Project Settings by clicking the gear icon next to "Project Overview".
    *   In the "Your apps" section, click the web icon (`</>`) to create a new web app.
    *   Give your app a nickname and click "Register app".
4.  **Get Firebase Config**: After registering, Firebase will display a `firebaseConfig` object. It will look something like this:

    ```javascript
    const firebaseConfig = {
      apiKey: "AIzaSy...",
      authDomain: "your-project-id.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project-id.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abcdef123456"
    };
    ```

5.  **Create `.env` file**: In the root directory of this project, create a new file named `.env`. **Important**: This file stores your secret credentials and should not be shared publicly.
6.  **Add Firebase Credentials to `.env`**: Copy the values from your `firebaseConfig` object into the `.env` file, using the following variable names:

    ```
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
    ```

### 2. Set up Google Gemini API Key

The AI features in this app, like the Price Optimizer and barcode scanning, are powered by the Google Gemini API.

1.  **Get an API Key**: Go to [Google AI Studio](https://aistudio.google.com/app/apikey) to generate a new API key.
2.  **Add Gemini Key to `.env`**: Add the generated key to your `.env` file:

    ```
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```

### 3. Restart Your Application

After you've added all the credentials to your `.env` file, you must **restart the development server** for the changes to take effect.
