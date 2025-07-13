import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

/**
 * Service account credentials interface
 */
interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

/**
 * Firebase Admin configuration options
 */
interface FirebaseAdminConfig {
  credential?: ServiceAccount;
  projectId?: string;
  storageBucket?: string;
  databaseURL?: string;
}

/**
 * User creation data interface
 */
interface CreateUserData {
  email: string;
  password?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  disabled?: boolean;
  customClaims?: Record<string, any>;
}

/**
 * User update data interface
 */
interface UpdateUserData {
  email?: string;
  password?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  disabled?: boolean;
}

/**
 * Firebase Admin SDK singleton class for server-side operations
 */
class FirebaseAdmin {
  private static instance: FirebaseAdmin;
  private app: any;
  private _firestore: any;
  private _storage: any;
  private _auth: any;
  private initialized = false;

  private constructor() {
    this.initialize();
  }

  /**
   * Get the singleton instance of FirebaseAdmin
   * @returns FirebaseAdmin instance
   */
  public static getInstance(): FirebaseAdmin {
    if (!FirebaseAdmin.instance) {
      FirebaseAdmin.instance = new FirebaseAdmin();
    }
    return FirebaseAdmin.instance;
  }

  /**
   * Initialize Firebase Admin SDK
   * @private
   */
  private initialize(): void {
    try {
      // Check if Firebase Admin is already initialized
      if (getApps().length > 0) {
        this.app = getApps()[0];
        this.initialized = true;
        return;
      }

      const config: FirebaseAdminConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      };

      // Try to use service account credentials first
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
          const serviceAccountKey: ServiceAccountCredentials = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT_KEY
          );
          config.credential = cert(serviceAccountKey);
        } catch (error) {
          console.error('Error parsing service account key:', error);
          throw new Error('Invalid service account key format');
        }
      } else if (
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_PROJECT_ID
      ) {
        // Use individual environment variables
        const serviceAccount: ServiceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
        config.credential = cert(serviceAccount);
      } else if (process.env.NODE_ENV === 'production') {
        // In production, try to use Application Default Credentials
        console.log('Using Application Default Credentials');
      } else {
        throw new Error(
          'Firebase service account credentials not found. Please set FIREBASE_SERVICE_ACCOUNT_KEY or individual credential environment variables.'
        );
      }

      // Validate required environment variables
      if (!config.projectId) {
        throw new Error('FIREBASE_PROJECT_ID environment variable is required');
      }

      this.app = initializeApp(config);
      this.initialized = true;

      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      throw error;
    }
  }

  /**
   * Get Firestore Admin instance
   * @returns Firestore Admin instance
   */
  public get firestore() {
    if (!this.initialized) {
      throw new Error('Firebase Admin not initialized');
    }
    if (!this._firestore) {
      this._firestore = getFirestore(this.app);
    }
    return this._firestore;
  }

  /**
   * Get Storage Admin instance
   * @returns Storage Admin instance
   */
  public get storage() {
    if (!this.initialized) {
      throw new Error('Firebase Admin not initialized');
    }
    if (!this._storage) {
      this._storage = getStorage(this.app);
    }
    return this._storage;
  }

  /**
   * Get Auth Admin instance
   * @returns Auth Admin instance
   */
  public get auth() {
    if (!this.initialized) {
      throw new Error('Firebase Admin not initialized');
    }
    if (!this._auth) {
      this._auth = getAuth(this.app);
    }
    return this._auth;
  }

  /**
   * Create a new user with email and password
   * @param userData - User creation data
   * @returns Promise<UserRecord>
   */
  public async createUser(userData: CreateUserData) {
    try {
      const userRecord = await this.auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        emailVerified: userData.emailVerified ?? false,
        disabled: userData.disabled ?? false,
      });

      // Set custom claims if provided
      if (userData.customClaims) {
        await this.auth.setCustomUserClaims(userRecord.uid, userData.customClaims);
      }

      console.log('Successfully created new user:', userRecord.uid);
      return userRecord;
    } catch (error) {
      console.error('Error creating new user:', error);
      throw error;
    }
  }

  /**
   * Update an existing user
   * @param uid - User ID
   * @param updateData - User update data
   * @returns Promise<UserRecord>
   */
  public async updateUser(uid: string, updateData: UpdateUserData) {
    try {
      const userRecord = await this.auth.updateUser(uid, updateData);
      console.log('Successfully updated user:', uid);
      return userRecord;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete a user by UID
   * @param uid - User ID
   * @returns Promise<void>
   */
  public async deleteUser(uid: string): Promise<void> {
    try {
      await this.auth.deleteUser(uid);
      console.log('Successfully deleted user:', uid);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get user by UID
   * @param uid - User ID
   * @returns Promise<UserRecord>
   */
  public async getUserByUid(uid: string) {
    try {
      const userRecord = await this.auth.getUser(uid);
      return userRecord;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   * @param email - User email
   * @returns Promise<UserRecord>
   */
  public async getUserByEmail(email: string) {
    try {
      const userRecord = await this.auth.getUserByEmail(email);
      return userRecord;
    } catch (error) {
      console.error('Error fetching user data by email:', error);
      throw error;
    }
  }

  /**
   * Set custom claims for a user
   * @param uid - User ID
   * @param customClaims - Custom claims object
   * @returns Promise<void>
   */
  public async setCustomUserClaims(uid: string, customClaims: Record<string, any>): Promise<void> {
    try {
      await this.auth.setCustomUserClaims(uid, customClaims);
      console.log('Successfully set custom claims for user:', uid);
    } catch (error) {
      console.error('Error setting custom claims:', error);
      throw error;
    }
  }

  /**
   * Verify an ID token
   * @param idToken - Firebase ID token
   * @returns Promise<DecodedIdToken>
   */
  public async verifyIdToken(idToken: string) {
    try {
      const decodedToken = await this.auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw error;
    }
  }

  /**
   * Create a custom token for a user
   * @param uid - User ID
   * @param additionalClaims - Additional claims to include in the token
   * @returns Promise<string>
   */
  public async createCustomToken(uid: string, additionalClaims?: Record<string, any>): Promise<string> {
    try {
      const customToken = await this.auth.createCustomToken(uid, additionalClaims);
      return customToken;
    } catch (error) {
      console.error('Error creating custom token:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Firebase Storage
   * @param filePath - Local file path or Buffer
   * @param destination - Storage destination path
   * @param options - Upload options
   * @returns Promise<[File]>
   */
  public async uploadFile(
    filePath: string | Buffer,
    destination: string,
    options?: {
      metadata?: Record<string, any>;
      public?: boolean;
    }
  ) {
    try {
      const bucket = this.storage.bucket();
      const file = bucket.file(destination);

      const uploadOptions: any = {
        metadata: options?.metadata || {},
      };

      if (options?.public) {
        uploadOptions.predefinedAcl = 'publicRead';
      }

      let uploadResult;
      if (Buffer.isBuffer(filePath)) {
        uploadResult = await file.save(filePath, uploadOptions);
      } else {
        uploadResult = await bucket.upload(filePath, {
          destination,
          ...uploadOptions,
        });
      }

      console.log('File uploaded successfully:', destination);
      return uploadResult;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Firebase Storage
   * @param filePath - Storage file path
   * @returns Promise<void>
   */
  public async deleteFile(filePath: string): Promise<void> {
    try {
      const bucket = this.storage.bucket();
      await bucket.file(filePath).delete();
      console.log('File deleted successfully:', filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get a signed URL for a file
   * @param filePath - Storage file path
   * @param options - Signed URL options
   * @returns Promise<string[]>
   */
  public async getSignedUrl(
    filePath: string,
    options: {
      action: 'read' | 'write' | 'delete';
      expires: Date | number | string;
    }
  ): Promise<string[]> {
    try {
      const bucket = this.storage.bucket();
      const signedUrls = await bucket.file(filePath).getSignedUrl(options);
      return signedUrls;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Create a Firestore document
   * @param collection - Collection name
   * @param docId - Document ID (optional)
   * @param data - Document data
   * @returns Promise<WriteResult | DocumentReference>
   */
  public async createDocument(collection: string, data: any, docId?: string) {
    try {
      const db = this.firestore;
      let result;

      if (docId) {
        result = await db.collection(collection).doc(docId).set(data);
        console.log('Document created with ID:', docId);
      } else {
        result = await db.collection(collection).add(data);
        console.log('Document created with ID:', result.id);
      }

      return result;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  /**
   * Update a Firestore document
   * @param collection - Collection name
   * @param docId - Document ID
   * @param data - Update data
   * @returns Promise<WriteResult>
   */
  public async updateDocument(collection: string, docId: string, data: any) {
    try {
      const db = this.firestore;
      const result = await db.collection(collection).doc(docId).update(data);
      console.log('Document updated:', docId);
      return result;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  /**
   * Delete a Firestore document
   * @param collection - Collection name
   * @param docId - Document ID
   * @returns Promise<WriteResult>
   */
  public async deleteDocument(collection: string, docId: string) {
    try {
      const db = this.firestore;
      const result = await db.collection(collection).doc(docId).delete();
      console.log('Document deleted:', docId);
      return result;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get a Firestore document
   * @param collection - Collection name
   * @param docId - Document ID
   * @returns Promise<DocumentSnapshot>
   */
  public async getDocument(collection: string, docId: string) {
    try {
      const db = this.firestore;
      const doc = await db.collection(collection).doc(docId).get();
      return doc;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  /**
   * Query Firestore collection
   * @param collection - Collection name
   * @param queryFn - Query function
   * @returns Promise<QuerySnapshot>
   */
  public async queryCollection(collection: string, queryFn?: (query: any) => any) {
    try {
      const db = this.firestore;
      let query = db.collection(collection);

      if (queryFn) {
        query = queryFn(query);
      }

      const snapshot = await query.get();
      return snapshot;
    } catch (error) {
      console.error('Error querying collection:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseAdmin = FirebaseAdmin.getInstance();

// Export individual services for convenience
export const adminFirestore = firebaseAdmin.firestore;
export const adminStorage = firebaseAdmin.storage;
export const adminAuth = firebaseAdmin.auth;

// Export types
export type { CreateUserData, UpdateUserData, ServiceAccountCredentials, FirebaseAdminConfig };

export default firebaseAdmin;
