import { 
  Auth, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { 
  Firestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  getDocs,
  writeBatch,
  serverTimestamp,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  enableNetwork,
  disableNetwork,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { 
  StorageReference, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  uploadBytesResumable,
  UploadTask
} from 'firebase/storage';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { z } from 'zod';

// Types and Interfaces
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  role: 'citizen' | 'admin' | 'moderator';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  lastLoginAt: Date;
}

export interface CivicReport {
  id?: string;
  type: 'pothole' | 'streetlight' | 'graffiti' | 'trash' | 'noise' | 'other';
  title: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  images: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'submitted' | 'in-review' | 'in-progress' | 'resolved' | 'rejected';
  submittedBy: string;
  submittedAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  resolvedAt?: Date;
  upvotes: number;
  downvotes: number;
  comments: Comment[];
}

export interface Comment {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  isOfficial: boolean;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface UseFirestoreOptions<T> {
  cacheTimeout?: number;
  enableOffline?: boolean;
  transform?: (data: any) => T;
}

// Validation Schemas
export const reportSchema = z.object({
  type: z.enum(['pothole', 'streetlight', 'graffiti', 'trash', 'noise', 'other']),
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title too long'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(1000, 'Description too long'),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().min(1, 'Address is required')
  }),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
});

export const userProfileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional()
});

// Authentication Hooks
export function useAuth(auth: Auth) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        setAuthState({
          user,
          loading: false,
          error: null
        });
      },
      (error) => {
        setAuthState({
          user: null,
          loading: false,
          error: error.message
        });
      }
    );

    return unsubscribe;
  }, [auth]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      return result;
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  }, [auth]);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  }, [auth]);

  const signOut = useCallback(async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  }, [auth]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw error;
    }
  }, [auth]);

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    resetPassword
  };
}

// Firestore Hooks
export function useFirestore<T = DocumentData>(
  db: Firestore,
  collectionName: string,
  options: UseFirestoreOptions<T> = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<string, { data: T[]; timestamp: number }>());
  const { cacheTimeout = 300000, enableOffline = true, transform } = options;

  const getCacheKey = useCallback((query: any) => {
    return JSON.stringify(query);
  }, []);

  const add = useCallback(async (data: Partial<T>) => {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }, [db, collectionName]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }, [db, collectionName]);

  const remove = useCallback(async (id: string) => {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }, [db, collectionName]);

  const get = useCallback(async (id: string): Promise<T | null> => {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as T;
        return transform ? transform(data) : data;
      }
      return null;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }, [db, collectionName, transform]);

  const getAll = useCallback(async (constraints: any[] = []): Promise<T[]> => {
    try {
      setLoading(true);
      const cacheKey = getCacheKey(constraints);
      const cached = cache.current.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < cacheTimeout) {
        setData(cached.data);
        setLoading(false);
        return cached.data;
      }

      const q = constraints.length 
        ? query(collection(db, collectionName), ...constraints)
        : collection(db, collectionName);
      
      const querySnapshot = await getDocs(q);
      const results: T[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as T;
        results.push(transform ? transform(data) : data);
      });

      cache.current.set(cacheKey, { data: results, timestamp: Date.now() });
      setData(results);
      setLoading(false);
      return results;
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
      throw error;
    }
  }, [db, collectionName, cacheTimeout, getCacheKey, transform]);

  const batchWrite = useCallback(async (operations: Array<{
    type: 'add' | 'update' | 'delete';
    id?: string;
    data?: Partial<T>;
  }>) => {
    try {
      const batch = writeBatch(db);
      
      operations.forEach(operation => {
        const docRef = operation.id 
          ? doc(db, collectionName, operation.id)
          : doc(collection(db, collectionName));
          
        switch (operation.type) {
          case 'add':
            batch.set(docRef, {
              ...operation.data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            break;
          case 'update':
            batch.update(docRef, {
              ...operation.data,
              updatedAt: serverTimestamp()
            });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });
      
      await batch.commit();
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }, [db, collectionName]);

  useEffect(() => {
    if (enableOffline) {
      enableNetwork(db).catch(console.error);
    }
    
    return () => {
      if (enableOffline) {
        disableNetwork(db).catch(console.error);
      }
    };
  }, [db, enableOffline]);

  return {
    data,
    loading,
    error,
    add,
    update,
    remove,
    get,
    getAll,
    batchWrite
  };
}

// Real-time Data Hook
export function useRealtimeData<T = DocumentData>(
  db: Firestore,
  collectionName: string,
  constraints: any[] = [],
  options: UseFirestoreOptions<T> = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { transform } = options;

  useEffect(() => {
    const q = constraints.length 
      ? query(collection(db, collectionName), ...constraints)
      : collection(db, collectionName);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const results: T[] = [];
        snapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() } as T;
          results.push(transform ? transform(data) : data);
        });
        setData(results);
        setLoading(false);
        setError(null);
      },
      (error) => {
        setError(error.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [db, collectionName, constraints, transform]);

  return { data, loading, error };
}

// File Upload Hook
export function useFileUpload(storage: any) {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const uploadFile = useCallback(async (
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> => {
    const uploadId = `${Date.now()}-${Math.random()}`;
    
    try {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            };
            
            setUploads(prev => new Map(prev.set(uploadId, progress)));
            onProgress?.(progress);
          },
          (error) => {
            setErrors(prev => new Map(prev.set(uploadId, error.message)));
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setUploads(prev => {
                const newUploads = new Map(prev);
                newUploads.delete(uploadId);
                return newUploads;
              });
              resolve(downloadURL);
            } catch (error: any) {
              reject(error);
            }
          }
        );
      });
    } catch (error: any) {
      setErrors(prev => new Map(prev.set(uploadId, error.message)));
      throw error;
    }
  }, [storage]);

  const uploadMultipleFiles = useCallback(async (
    files: File[],
    pathGenerator: (file: File, index: number) => string,
    onProgress?: (overallProgress: number) => void
  ): Promise<string[]> => {
    const uploadPromises = files.map((file, index) => {
      return uploadFile(file, pathGenerator(file, index));
    });

    if (onProgress) {
      const interval = setInterval(() => {
        const totalProgress = Array.from(uploads.values())
          .reduce((sum, progress) => sum + progress.percentage, 0) / uploads.size;
        onProgress(totalProgress);
      }, 100);

      try {
        const results = await Promise.all(uploadPromises);
        clearInterval(interval);
        onProgress(100);
        return results;
      } catch (error) {
        clearInterval(interval);
        throw error;
      }
    }

    return Promise.all(uploadPromises);
  }, [uploadFile, uploads]);

  const deleteFile = useCallback(async (path: string) => {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error: any) {
      throw error;
    }
  }, [storage]);

  return {
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    uploads: Array.from(uploads.values()),
    errors: Array.from(errors.values())
  };
}

// User Profile Hook
export function useUserProfile(db: Firestore, userId: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (doc) => {
        if (doc.exists()) {
          setProfile({ id: doc.id, ...doc.data() } as UserProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
        setError(null);
      },
      (error) => {
        setError(error.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [db, userId]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }, [db, userId]);

  const createProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, {
        ...data,
        uid: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }, [db, userId]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    createProfile
  };
}

// Form Validation Hook
export function useFormValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = useCallback((data: any): data is T => {
    try {
      schema.parse(data);
      setErrors({});
      setIsValid(true);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
      }
      setIsValid(false);
      return false;
    }
  }, [schema]);

  const validateField = useCallback((name: string, value: any) => {
    try {
      const fieldSchema = schema.shape?.[name as keyof typeof schema.shape];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({
          ...prev,
          [name]: error.errors[0]?.message || 'Validation error'
        }));
      }
    }
  }, [schema]);

  const touch = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const reset = useCallback(() => {
    setErrors({});
    setIsValid(false);
    setTouched({});
  }, []);

  return {
    errors,
    isValid,
    touched,
    validate,
    validateField,
    touch,
    reset
  };
}

// Civic Reports Hook
export function useCivicReports(db: Firestore, userId?: string) {
  const { data: reports, loading, error, add, update, remove } = useFirestore<CivicReport>(db, 'reports');
  const [submitLoading, setSubmitLoading] = useState(false);

  const submitReport = useCallback(async (reportData: Omit<CivicReport, 'id' | 'submittedAt' | 'updatedAt' | 'upvotes' | 'downvotes' | 'comments'>) => {
    if (!userId) throw new Error('User must be authenticated to submit reports');
    
    setSubmitLoading(true);
    try {
      const report: Partial<CivicReport> = {
        ...reportData,
        submittedBy: userId,
        status: 'submitted',
        upvotes: 0,
        downvotes: 0,
        comments: []
      };
      
      const reportId = await add(report);
      return reportId;
    } finally {
      setSubmitLoading(false);
    }
  }, [add, userId]);

  const getUserReports = useCallback(async () => {
    if (!userId) return [];
    return data.filter(report => report.submittedBy === userId);
  }, [data, userId]);

  const getReportsByStatus = useCallback((status: CivicReport['status']) => {
    return data.filter(report => report.status === status);
  }, [data]);

  const getReportsByType = useCallback((type: CivicReport['type']) => {
    return data.filter(report => report.type === type);
  }, [data]);

  const upvoteReport = useCallback(async (reportId: string) => {
    const report = data.find(r => r.id === reportId);
    if (report) {
      await update(reportId, { upvotes: report.upvotes + 1 });
    }
  }, [data, update]);

  const downvoteReport = useCallback(async (reportId: string) => {
    const report = data.find(r => r.id === reportId);
    if (report) {
      await update(reportId, { downvotes: report.downvotes + 1 });
    }
  }, [data, update]);

  return {
    reports: data,
    loading: loading || submitLoading,
    error,
    submitReport,
    getUserReports,
    getReportsByStatus,
    getReportsByType,
    updateReport: update,
    deleteReport: remove,
    upvoteReport,
    downvoteReport
  };
}

// Analytics Hook
export function useAnalytics(db: Firestore) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getReportAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const reportsRef = collection(db, 'reports');
      const snapshot = await getDocs(reportsRef);
      
      const allReports: CivicReport[] = [];
      snapshot.forEach(doc => {
        allReports.push({ id: doc.id, ...doc.data() } as CivicReport);
      });

      const analytics = {
        totalReports: allReports.length,
        reportsByStatus: allReports.reduce((acc, report) => {
          acc[report.status] = (acc[report.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        reportsByType: allReports.reduce((acc, report) => {
          acc[report.type] = (acc[report.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        reportsByPriority: allReports.reduce((acc, report) => {
          acc[report.priority] = (acc[report.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        averageResolutionTime: allReports
          .filter(r => r.status === 'resolved' && r.resolvedAt)
          .reduce((acc, report) => {
            const days = report.resolvedAt && report.submittedAt 
              ? (report.resolvedAt.getTime() - report.submittedAt.getTime()) / (1000 * 60 * 60 * 24)
              : 0;
            return acc + days;
          }, 0) / allReports.filter(r => r.status === 'resolved').length || 0,
        recentActivity: allReports
          .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
          .slice(0, 10)
      };

      setAnalytics(analytics);
      setLoading(false);
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    getReportAnalytics();
  }, [getReportAnalytics]);

  return { analytics, loading, error, refresh: getReportAnalytics };
}

// Offline Support Hook
export function useOfflineSupport(db: Firestore) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      enableNetwork(db).catch(console.error);
    };

    const handleOffline = () => {
      setIsOnline(false);
      disableNetwork(db).catch(console.error);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [db]);

  const syncPendingOperations = useCallback(async () => {
    if (!isOnline || pendingOperations.length === 0) return;

    try {
      // Process pending operations when back online
      for (const operation of pendingOperations) {
        // Execute stored operations
        await operation();
      }
      setPendingOperations([]);
    } catch (error) {
      console.error('Failed to sync pending operations:', error);
    }
  }, [isOnline, pendingOperations]);

  useEffect(() => {
    if (isOnline) {
      syncPendingOperations();
    }
  }, [isOnline, syncPendingOperations]);

  return {
    isOnline,
    pendingOperations: pendingOperations.length,
    addPendingOperation: (operation: () => Promise<any>) => {
      setPendingOperations(prev => [...prev, operation]);
    }
  };
}

export { reportSchema, userProfileSchema };