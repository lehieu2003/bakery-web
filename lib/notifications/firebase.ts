import {
  App,
  cert,
  getApp,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

type FirebasePushResult = {
  attempted: number;
  successCount: number;
  failureCount: number;
  successfulTokens: string[];
  permanentFailureTokens: string[];
  retryableFailureTokens: string[];
};

type MessageResponseLike = {
  success: boolean;
  error?: { code?: string } | null;
};

function parseServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (!projectId || !clientEmail || !privateKeyRaw) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
  };
}

function getFirebaseApp(): App | null {
  const creds = parseServiceAccount();
  if (!creds) return null;

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    credential: cert(creds),
    projectId: creds.projectId,
  });
}

function isPermanentFailureCode(code?: string) {
  return (
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token'
  );
}

export function mapMulticastResponses(
  tokens: string[],
  responses: MessageResponseLike[],
) {
  const permanentFailureTokens: string[] = [];
  const retryableFailureTokens: string[] = [];
  const successfulTokens: string[] = [];

  responses.forEach((item, idx) => {
    const token = tokens[idx];
    if (!token) return;
    if (item.success) {
      successfulTokens.push(token);
      return;
    }
    const code = item.error?.code;
    if (isPermanentFailureCode(code)) {
      permanentFailureTokens.push(token);
    } else {
      retryableFailureTokens.push(token);
    }
  });

  return {
    successfulTokens,
    permanentFailureTokens,
    retryableFailureTokens,
  };
}

export async function sendTransactionalPushNotification(args: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  linkUrl?: string | null;
}): Promise<FirebasePushResult> {
  const tokens = Array.from(new Set(args.tokens.filter(Boolean)));
  if (tokens.length === 0) {
    return {
      attempted: 0,
      successCount: 0,
      failureCount: 0,
      successfulTokens: [],
      permanentFailureTokens: [],
      retryableFailureTokens: [],
    };
  }

  const app = getFirebaseApp();
  if (!app) {
    throw new Error(
      'Firebase push is enabled but credentials are missing (FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY)',
    );
  }

  const response = await getMessaging(app).sendEachForMulticast({
    tokens,
    notification: {
      title: args.title,
      body: args.body,
    },
    webpush: args.linkUrl
      ? {
          fcmOptions: {
            link: args.linkUrl,
          },
        }
      : undefined,
    data: args.data,
  });

  const {
    successfulTokens,
    permanentFailureTokens,
    retryableFailureTokens,
  } = mapMulticastResponses(tokens, response.responses);

  return {
    attempted: tokens.length,
    successCount: response.successCount,
    failureCount: response.failureCount,
    successfulTokens,
    permanentFailureTokens,
    retryableFailureTokens,
  };
}
