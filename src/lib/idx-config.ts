/**
 * Google Cloud Project IDX Configuration and Integration
 * 
 * This file provides configuration and utilities for working with Google Cloud Project IDX
 * development environment in conjunction with the Next.js civic reporting application.
 */

/**
 * IDX workspace configuration interface
 */
interface IDXWorkspaceConfig {
  name: string;
  description: string;
  version: string;
  features: string[];
  ports: Record<string, IDXPortConfig>;
  environment: Record<string, string>;
  scripts: Record<string, string>;
  extensions: string[];
}

/**
 * IDX port configuration interface
 */
interface IDXPortConfig {
  port: number;
  name: string;
  description: string;
  manager: 'web' | 'tcp';
  onPreviewStart?: string;
  public?: boolean;
}

/**
 * IDX development environment configuration
 */
interface IDXDevConfig {
  nodeVersion: string;
  packages: string[];
  services: string[];
  emulators: Record<string, any>;
  buildCommands: string[];
  startCommands: string[];
}

/**
 * Firebase emulator configuration for IDX
 */
interface FirebaseEmulatorConfig {
  auth: {
    host: string;
    port: number;
  };
  firestore: {
    host: string;
    port: number;
  };
  functions: {
    host: string;
    port: number;
  };
  hosting: {
    host: string;
    port: number;
  };
  storage: {
    host: string;
    port: number;
  };
  ui: {
    host: string;
    port: number;
    enabled: boolean;
  };
}

/**
 * Default IDX workspace configuration for civic reporting application
 */
export const DEFAULT_IDX_CONFIG: IDXWorkspaceConfig = {
  name: 'civic-reporting-nextjs',
  description: 'Next.js civic reporting application with Firebase integration optimized for Google Cloud Project IDX',
  version: '1.0.0',
  features: [
    'Next.js 15 with App Router',
    'TypeScript support',
    'Tailwind CSS with Shadcn/UI',
    'Firebase Authentication and Firestore',
    'Firebase Emulator Suite',
    'Google Maps integration',
    'Real-time analytics',
    'Hot reloading',
    'IDX development environment'
  ],
  ports: {
    nextjs: {
      port: 3000,
      name: 'Next.js Development Server',
      description: 'Main application development server',
      manager: 'web',
      onPreviewStart: 'npm run dev',
      public: true
    },
    firebaseAuth: {
      port: 9099,
      name: 'Firebase Auth Emulator',
      description: 'Firebase Authentication emulator for development',
      manager: 'web',
      public: false
    },
    firestore: {
      port: 8080,
      name: 'Firestore Emulator',
      description: 'Cloud Firestore emulator for development',
      manager: 'web',
      public: false
    },
    firebaseFunctions: {
      port: 5001,
      name: 'Firebase Functions Emulator',
      description: 'Cloud Functions emulator for development',
      manager: 'web',
      public: false
    },
    firebaseHosting: {
      port: 9000,
      name: 'Firebase Hosting Emulator',
      description: 'Firebase Hosting emulator for development',
      manager: 'web',
      public: false
    },
    firebaseStorage: {
      port: 9199,
      name: 'Firebase Storage Emulator',
      description: 'Cloud Storage emulator for development',
      manager: 'web',
      public: false
    },
    firebaseUI: {
      port: 4000,
      name: 'Firebase Emulator Suite UI',
      description: 'Firebase Emulator Suite management interface',
      manager: 'web',
      public: true
    }
  },
  environment: {
    NODE_ENV: 'development',
    NEXT_PUBLIC_APP_ENV: 'idx',
    NEXT_PUBLIC_FIREBASE_USE_EMULATOR: 'true',
    FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
    FIRESTORE_EMULATOR_HOST: 'localhost:8080',
    FIREBASE_FUNCTIONS_EMULATOR_HOST: 'localhost:5001',
    FIREBASE_HOSTING_EMULATOR_HOST: 'localhost:9000',
    FIREBASE_STORAGE_EMULATOR_HOST: 'localhost:9199',
    GOOGLE_CLOUD_PROJECT: 'civic-reporting-dev',
    IDX_WORKSPACE: 'true'
  },
  scripts: {
    'dev': 'next dev --turbopack',
    'build': 'next build',
    'start': 'next start',
    'lint': 'next lint',
    'firebase:emulate': 'firebase emulators:start --only auth,firestore,functions,hosting,storage',
    'firebase:ui': 'firebase emulators:start --only auth,firestore,functions,hosting,storage,ui',
    'idx:setup': 'npm install && firebase login --no-localhost',
    'idx:clean': 'rm -rf .next node_modules/.cache',
    'idx:reset': 'npm run idx:clean && npm install'
  },
  extensions: [
    'ms-vscode.vscode-typescript-next',
    'bradlc.vscode-tailwindcss',
    'esbenp.prettier-vscode',
    'dbaeumer.vscode-eslint',
    'firebase.firebase-vscode',
    'googlecloudtools.cloudcode'
  ]
};

/**
 * Firebase emulator configuration for IDX development
 */
export const FIREBASE_EMULATOR_CONFIG: FirebaseEmulatorConfig = {
  auth: {
    host: 'localhost',
    port: 9099
  },
  firestore: {
    host: 'localhost',
    port: 8080
  },
  functions: {
    host: 'localhost',
    port: 5001
  },
  hosting: {
    host: 'localhost',
    port: 9000
  },
  storage: {
    host: 'localhost',
    port: 9199
  },
  ui: {
    host: 'localhost',
    port: 4000,
    enabled: true
  }
};

/**
 * IDX development configuration
 */
export const IDX_DEV_CONFIG: IDXDevConfig = {
  nodeVersion: '20.x',
  packages: [
    'nodejs_20',
    'npm',
    'git',
    'curl',
    'jq',
    'firebase-tools',
    'google-cloud-sdk'
  ],
  services: [
    'firebase-emulators',
    'postgresql',
    'redis'
  ],
  emulators: {
    firebase: FIREBASE_EMULATOR_CONFIG
  },
  buildCommands: [
    'npm install',
    'npm run build'
  ],
  startCommands: [
    'npm run firebase:emulate &',
    'sleep 5',
    'npm run dev'
  ]
};

/**
 * IDX utility functions
 */
export class IDXUtils {
  /**
   * Check if running in IDX environment
   */
  static isIDXEnvironment(): boolean {
    return process.env.IDX_WORKSPACE === 'true' || process.env.NEXT_PUBLIC_APP_ENV === 'idx';
  }

  /**
   * Get IDX environment variables
   */
  static getIDXEnvironment(): Record<string, string> {
    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      IDX_WORKSPACE: process.env.IDX_WORKSPACE || 'false',
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'civic-reporting-dev',
      FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'civic-reporting-dev',
      USE_FIREBASE_EMULATOR: process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR || 'false'
    };
  }

  /**
   * Initialize IDX workspace
   */
  static async initializeWorkspace(): Promise<void> {
    if (!this.isIDXEnvironment()) {
      console.log('Not in IDX environment, skipping IDX initialization');
      return;
    }

    console.log('Initializing IDX workspace for civic reporting application...');
    
    try {
      // Set up environment variables
      const env = this.getIDXEnvironment();
      Object.entries(env).forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });

      // Initialize Firebase project if needed
      if (env.USE_FIREBASE_EMULATOR === 'true') {
        console.log('Starting Firebase emulators...');
        await this.startFirebaseEmulators();
      }

      console.log('IDX workspace initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IDX workspace:', error);
    }
  }

  /**
   * Start Firebase emulators
   */
  static async startFirebaseEmulators(): Promise<void> {
    try {
      const { spawn } = require('child_process');
      
      const emulatorProcess = spawn('firebase', [
        'emulators:start',
        '--only', 'auth,firestore,functions,hosting,storage',
        '--project', 'civic-reporting-dev'
      ], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      emulatorProcess.stdout?.on('data', (data: Buffer) => {
        console.log('[Firebase Emulators]:', data.toString());
      });

      emulatorProcess.stderr?.on('data', (data: Buffer) => {
        console.error('[Firebase Emulators Error]:', data.toString());
      });

      console.log('Firebase emulators starting...');
    } catch (error) {
      console.error('Failed to start Firebase emulators:', error);
    }
  }

  /**
   * Get Firebase emulator URLs
   */
  static getEmulatorURLs(): Record<string, string> {
    const config = FIREBASE_EMULATOR_CONFIG;
    
    return {
      auth: `http://${config.auth.host}:${config.auth.port}`,
      firestore: `http://${config.firestore.host}:${config.firestore.port}`,
      functions: `http://${config.functions.host}:${config.functions.port}`,
      hosting: `http://${config.hosting.host}:${config.hosting.port}`,
      storage: `http://${config.storage.host}:${config.storage.port}`,
      ui: `http://${config.ui.host}:${config.ui.port}`
    };
  }

  /**
   * Generate IDX workspace configuration file
   */
  static generateWorkspaceConfig(): string {
    const config = {
      name: DEFAULT_IDX_CONFIG.name,
      description: DEFAULT_IDX_CONFIG.description,
      workspace: {
        onCreate: {
          openFiles: ['README.md', 'src/app/page.tsx', '.idx/dev.nix']
        },
        onStart: {
          command: 'npm run dev'
        }
      },
      dev: {
        nix: {
          packages: IDX_DEV_CONFIG.packages
        },
        ports: Object.fromEntries(
          Object.entries(DEFAULT_IDX_CONFIG.ports).map(([key, value]) => [
            value.port.toString(),
            {
              name: value.name,
              manager: value.manager,
              onPreviewStart: value.onPreviewStart
            }
          ])
        ),
        env: DEFAULT_IDX_CONFIG.environment
      },
      previews: {
        web: {
          command: ['npm', 'run', 'dev', '--', '--port', '$PORT', '--hostname', '0.0.0.0'],
          manager: 'web'
        }
      }
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Setup development database
   */
  static async setupDevDatabase(): Promise<void> {
    if (!this.isIDXEnvironment()) return;

    console.log('Setting up development database...');
    
    try {
      // Initialize Firestore with development data
      const { firestore } = await import('./firebase');
      
      // Create sample collections if they don't exist
      const collections = ['reports', 'users', 'analytics'];
      
      for (const collection of collections) {
        const collectionRef = firestore.collection(collection);
        const snapshot = await collectionRef.limit(1).get();
        
        if (snapshot.empty) {
          console.log(`Creating sample data for ${collection}...`);
          await this.createSampleData(collection);
        }
      }
      
      console.log('Development database setup completed');
    } catch (error) {
      console.error('Failed to setup development database:', error);
    }
  }

  /**
   * Create sample data for development
   */
  private static async createSampleData(collection: string): Promise<void> {
    try {
      const { firestore } = await import('./firebase');
      const collectionRef = firestore.collection(collection);

      const sampleData = this.getSampleData(collection);
      
      for (const data of sampleData) {
        await collectionRef.add(data);
      }
      
      console.log(`Sample data created for ${collection}`);
    } catch (error) {
      console.error(`Failed to create sample data for ${collection}:`, error);
    }
  }

  /**
   * Get sample data for collections
   */
  private static getSampleData(collection: string): any[] {
    const timestamp = new Date();
    
    switch (collection) {
      case 'reports':
        return [
          {
            title: 'Road Pothole on MG Road',
            description: 'Large pothole causing traffic issues',
            category: 'Infrastructure',
            location: { lat: 9.9312, lng: 76.2673 },
            status: 'Open',
            priority: 'High',
            createdAt: timestamp,
            updatedAt: timestamp
          },
          {
            title: 'Street Light Not Working',
            description: 'Street light near bus stop is not working',
            category: 'Utilities',
            location: { lat: 9.9355, lng: 76.2707 },
            status: 'In Progress',
            priority: 'Medium',
            createdAt: timestamp,
            updatedAt: timestamp
          }
        ];
      
      case 'users':
        return [
          {
            displayName: 'John Doe',
            email: 'john.doe@example.com',
            role: 'citizen',
            createdAt: timestamp,
            lastActive: timestamp
          }
        ];
      
      case 'analytics':
        return [
          {
            type: 'report_submitted',
            category: 'Infrastructure',
            timestamp: timestamp,
            metadata: { source: 'web' }
          }
        ];
      
      default:
        return [];
    }
  }

  /**
   * Clean up IDX environment
   */
  static async cleanup(): Promise<void> {
    if (!this.isIDXEnvironment()) return;

    console.log('Cleaning up IDX environment...');
    
    try {
      // Stop Firebase emulators
      const { spawn } = require('child_process');
      
      spawn('pkill', ['-f', 'firebase'], { stdio: 'ignore' });
      
      // Clean up temporary files
      const fs = require('fs').promises;
      const path = require('path');
      
      const tempDirs = ['.next', 'node_modules/.cache'];
      
      for (const dir of tempDirs) {
        try {
          await fs.rmdir(path.join(process.cwd(), dir), { recursive: true });
          console.log(`Cleaned up ${dir}`);
        } catch (error) {
          // Directory might not exist, ignore
        }
      }
      
      console.log('IDX environment cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup IDX environment:', error);
    }
  }
}

/**
 * IDX-specific environment variables and configuration
 */
export const IDX_ENV = {
  // Check if running in IDX
  IS_IDX: IDXUtils.isIDXEnvironment(),
  
  // Get current environment
  ENVIRONMENT: IDXUtils.getIDXEnvironment(),
  
  // Firebase emulator URLs
  EMULATOR_URLS: IDXUtils.getEmulatorURLs(),
  
  // Development configuration
  DEV_CONFIG: IDX_DEV_CONFIG,
  
  // Workspace configuration
  WORKSPACE_CONFIG: DEFAULT_IDX_CONFIG
};

/**
 * Auto-initialize IDX environment on import
 */
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  // Only run on server-side in development
  IDXUtils.initializeWorkspace().catch(console.error);
}

// Export types for TypeScript support
export type {
  IDXWorkspaceConfig,
  IDXPortConfig,
  IDXDevConfig,
  FirebaseEmulatorConfig
};

export default {
  config: DEFAULT_IDX_CONFIG,
  firebaseEmulators: FIREBASE_EMULATOR_CONFIG,
  devConfig: IDX_DEV_CONFIG,
  utils: IDXUtils,
  env: IDX_ENV
};