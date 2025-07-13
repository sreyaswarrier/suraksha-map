import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

/**
 * Firebase configuration interface
 */
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Firebase configuration object using environment variables
 * All variables must be prefixed with NEXT_PUBLIC_ for client-side access
 */
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Validates that all required Firebase configuration variables are present
 * @throws Error if any required environment variable is missing
 */
function validateConfig(): void {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];

  const missingVars = requiredVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Firebase environment variables: ${missingVars.join(', ')}`
    );
  }
}

/**
 * Checks if the application is running in development mode
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Checks if code is running in browser environment
 */
const isBrowser = typeof window !== 'undefined';

// Validate configuration before initialization
validateConfig();

/**
 * Firebase app instance
 * Prevents multiple initialization by checking existing apps
 */
let app: FirebaseApp;

try {
  // Check if Firebase app is already initialized
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} catch (error) {
  console.error('Error initializing Firebase app:', error);
  throw new Error('Failed to initialize Firebase app');
}

/**
 * Firestore database instance
 * Used for storing civic reports, user data, and application metadata
 */
let db: Firestore;

try {
  db = getFirestore(app);
  
  // Connect to Firestore emulator in development if running in browser
  if (isDevelopment && isBrowser && !db._delegate._databaseId.database.includes('(default)')) {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
    } catch (error) {
      // Emulator might already be connected or not running
      console.warn('Firestore emulator connection failed:', error);
    }
  }
} catch (error) {
  console.error('Error initializing Firestore:', error);
  throw new Error('Failed to initialize Firestore');
}

/**
 * Firebase Authentication instance
 * Handles user registration, login, and authentication state management
 */
let auth: Auth;

try {
  auth = getAuth(app);
  
  // Connect to Auth emulator in development if running in browser
  if (isDevelopment && isBrowser && !auth.config.emulator) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
    } catch (error) {
      // Emulator might already be connected or not running
      console.warn('Auth emulator connection failed:', error);
    }
  }
} catch (error) {
  console.error('Error initializing Firebase Auth:', error);
  throw new Error('Failed to initialize Firebase Auth');
}

/**
 * Firebase Storage instance
 * Used for uploading and storing images, documents, and other files related to civic reports
 */
let storage: FirebaseStorage;

try {
  storage = getStorage(app);
  
  // Connect to Storage emulator in development if running in browser
  if (isDevelopment && isBrowser && !storage._host.includes('localhost')) {
    try {
      connectStorageEmulator(storage, 'localhost', 9199);
    } catch (error) {
      // Emulator might already be connected or not running
      console.warn('Storage emulator connection failed:', error);
    }
  }
} catch (error) {
  console.error('Error initializing Firebase Storage:', error);
  throw new Error('Failed to initialize Firebase Storage');
}

/**
 * Firebase services and utilities for export
 */
export {
  app as firebaseApp,
  db as firestore,
  auth,
  storage,
  isDevelopment,
  isBrowser
};

/**
 * Type exports for TypeScript development
 */
export type {
  FirebaseApp,
  Firestore,
  Auth,
  FirebaseStorage,
  FirebaseConfig
};

/**
 * Default export with all Firebase services
 * Useful for importing everything at once
 */
export default {
  app,
  firestore: db,
  auth,
  storage,
  config: firebaseConfig,
  isDevelopment,
  isBrowser
};