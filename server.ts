import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  delay
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import { initializeApp as initClientApp } from 'firebase/app';
import { 
  getFirestore as getClientFirestore, 
  collection, 
  getDocs, 
  updateDoc, 
  doc,
  query,
  limit,
  where,
  getDoc,
  initializeFirestore,
  PersistentCacheIndexManager
} from 'firebase/firestore';
import { readFile } from 'fs/promises';

dotenv.config();

// Initialize Firebase
async function initFirebase() {
  try {
    const configData = await readFile(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8');
    const config = JSON.parse(configData);
    
    // Initialize Client SDK
    const clientApp = initClientApp(config);
    const db = getClientFirestore(clientApp, config.firestoreDatabaseId);
    
    console.log(`[Firebase] Client SDK initialized (DB: ${config.firestoreDatabaseId})`);
    return db;
  } catch (err) {
    console.error('[Firebase] Init failed:', err);
    throw err;
  }
}

const db = await initFirebase();

// Test Connection
async function testFirestoreConnection() {
  try {
    console.log('[Firebase] Starting connection tests...');
    const testSnap = await getDocs(query(collection(db, 'settings'), limit(1)));
    console.log(`[Firebase] Connection test successful. Docs: ${testSnap.size}`);
  } catch (err: any) {
    console.error('[Firebase] Connection test failed:', err.message || err);
  }
}
testFirestoreConnection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// WhatsApp State
let sock: any = null;
let qrCode: string | null = null;
let connectionStatus: 'connecting' | 'open' | 'close' | 'refused' = 'close';

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version, isLatest } = await fetchLatestBaileysVersion();
  
  console.log(`Using WhatsApp v${version.join('.')}, isLatest: ${isLatest}`);

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      QRCode.toDataURL(qr, (err, url) => {
        if (!err) qrCode = url;
      });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(`[WhatsApp] Connection closed (status ${statusCode}). Reconnecting: ${shouldReconnect}`);
      connectionStatus = 'close';
      qrCode = null;
      
      if (shouldReconnect) {
        // For Stream Errored (515) or other protocol errors, wait a bit before retrying
        const delayAmount = statusCode === 515 ? 5000 : 2000;
        await delay(delayAmount);
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('[WhatsApp] Connection opened successfully');
      connectionStatus = 'open';
      qrCode = null; // Clear QR code once connected
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', (m: any) => {
    // Handle incoming messages if needed
  });
}

// Date Formatter for IST (Indian Standard Time)
const formatIST = (date: any) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const getJid = (phone: string) => {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, '');
  if (!clean) return null;
  // India specific auto-fix
  if (clean.length === 10) clean = '91' + clean;
  else if (clean.length === 12 && clean.startsWith('0')) clean = '91' + clean.substring(1);
  return `${clean}@s.whatsapp.net`;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // WhatsApp Endpoints
  app.get('/api/health', async (req, res) => {
    let firestoreStatus = 'unknown';
    try {
      await getDocs(query(collection(db, 'settings'), limit(1)));
      firestoreStatus = 'connected';
    } catch (e: any) {
      firestoreStatus = `error: ${e.message || 'unknown'}`;
    }

    res.json({ 
      status: 'ok', 
      waStatus: connectionStatus,
      firestoreStatus,
      uptime: process.uptime()
    });
  });

  app.get('/api/whatsapp/qr', (req, res) => {
    res.json({ qr: qrCode, status: connectionStatus });
  });

  app.get('/api/whatsapp/status', (req, res) => {
    res.json({ 
      status: connectionStatus, 
      connected: connectionStatus === 'open',
      phone: sock?.user?.id?.split(':')[0] || null
    });
  });

  app.post('/api/whatsapp/logout', async (req, res) => {
    try {
      if (sock) {
        await sock.logout();
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'No active session' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // API to trigger WhatsApp message (using Baileys or fallback to Proxy)
  app.post('/api/whatsapp/send', async (req, res) => {
    const { to, message } = req.body;
    console.log(`[WhatsApp] Received send request to: ${to}`);
    
    if (connectionStatus === 'open' && sock) {
      try {
        const jid = getJid(to);
        if (!jid) {
          return res.status(400).json({ error: 'Invalid phone number format', success: false });
        }

        // Optional: verify if on WhatsApp
        const [result] = await sock.onWhatsApp(jid);
        if (result && result.exists) {
           await sock.sendMessage(jid, { text: message });
           console.log(`[WhatsApp] Message sent via Baileys to verified JID: ${jid}`);
           return res.json({ success: true, method: 'baileys' });
        } else {
           console.warn(`[WhatsApp] JID ${jid} does not exist on WhatsApp. Attempting send anyway...`);
           await sock.sendMessage(jid, { text: message });
           return res.json({ success: true, method: 'baileys-unverified' });
        }
      } catch (err: any) {
        console.error('[WhatsApp] Baileys send error:', err);
        return res.status(500).json({ 
          error: `Failed to send via local device: ${err.message || 'Unknown error'}`, 
          success: false 
        });
      }
    }
    
    console.warn(`[WhatsApp] Send attempted but status is ${connectionStatus}`);
    res.status(400).json({ 
      error: `WhatsApp not connected (Status: ${connectionStatus}). Please link your device in Settings.`, 
      success: false 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Initialize WhatsApp after server is up
    connectToWhatsApp().catch(err => console.error("Baileys init error:", err));

    // Start TAT Notification Scheduler
    setInterval(() => {
      checkAndSendTATNotifications(db, sock, connectionStatus);
      checkAndSendTaskNotifications(db, sock, connectionStatus);
    }, 60000); // Check every minute
  });
}

async function checkAndSendTaskNotifications(db: any, sock: any, connectionStatus: string) {
  if (!sock || connectionStatus !== 'open') return;

  try {
    const now = new Date();
    const tasksRef = collection(db, 'tasks');
    const snapshot = await getDocs(tasksRef);

    for (const docSnapshot of snapshot.docs) {
      const task = docSnapshot.data();
      if (task.status !== 'pending') continue;
      if (!task.plannedDate) continue;

      const plannedDate = new Date(task.plannedDate);
      const diffMs = plannedDate.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));

      // Debug log for specific tasks the user is reporting
      if (task.code === 'CHK931331' || task.code === 'CHK734127' || diffMins < 60) {
        console.log(`[Task-Check] Code: ${task.code}, diffMins: ${diffMins}, planned: ${task.plannedDate}, now: ${now.toISOString()}`);
      }

      let changed = false;
      let updates: any = {};

      // 30 min reminder (due if 15-30 mins left)
      if (diffMins <= 30 && diffMins > 15 && !task.notified30m) {
        const sent = await sendWhatsAppGeneralTaskMsg(sock, task, 30);
        if (sent) {
          updates.notified30m = true;
          changed = true;
        }
      }

      // 15 min reminder (due if 5-15 mins left)
      if (diffMins <= 15 && diffMins > 5 && !task.notified15m) {
        const sent = await sendWhatsAppGeneralTaskMsg(sock, task, 15);
        if (sent) {
          updates.notified15m = true;
          changed = true;
        }
      }

      // 5 min reminder (due if 0-5 mins left)
      if (diffMins <= 5 && diffMins > 0 && !task.notified5m) {
        const sent = await sendWhatsAppGeneralTaskMsg(sock, task, 5);
        if (sent) {
          updates.notified5m = true;
          changed = true;
        }
      }

      if (diffMins <= 0 && !task.notifiedOverdue) {
        const sent = await sendWhatsAppGeneralTaskMsg(sock, task, 0);
        if (sent) {
          updates.notifiedOverdue = true;
          changed = true;
        }
      }

      if (changed) {
        await updateDoc(docSnapshot.ref, updates);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error checking Tasks:', err);
  }
}

async function sendWhatsAppGeneralTaskMsg(sock: any, task: any, minutes: number): Promise<boolean> {
  try {
    const phone = task.whatsapp;
    const jid = getJid(phone);
    if (!jid) return false;

    let message = '';
    
    if (minutes === 0) {
      message = `⚠️ *TASK OVERDUE: IMMEDIATE ACTION REQUIRED*\n\nTask: *${task.title}*\nPriority: *${task.priority?.toUpperCase()}*\nDeadline: ${formatIST(task.plannedDate)}\n\nThis task is now past its deadline. Please update the status immediately.`;
    } else {
      message = `🔔 *TASK REMINDER: ${minutes} MIN LEFT*\n\nTask: *${task.title}*\nPriority: *${task.priority?.toUpperCase()}*\nDeadline: ${formatIST(task.plannedDate)}\n\nPlease complete this task within the designated time.`;
    }
    
    await sock.sendMessage(jid, { text: message });
    console.log(`[Task-Notification] Sent ${minutes === 0 ? 'Overdue' : minutes + 'm'} reminder to ${phone} for ${task.title}`);
    return true;
  } catch (err) {
    console.error(`[Task-Notification] Failed to send:`, err);
    return false;
  }
}

async function checkAndSendTATNotifications(db: any, sock: any, connectionStatus: string) {
  if (!sock || connectionStatus !== 'open') return;

  try {
    const now = new Date();
    const fmsRef = collection(db, 'fms');
    // Fetch all pending/delayed entries
    const snapshot = await getDocs(fmsRef);

    for (const docSnapshot of snapshot.docs) {
      const entry = docSnapshot.data();
      if (entry.status === 'Completed') continue;
      if (!entry.steps || !Array.isArray(entry.steps)) continue;

      let updatedSteps = [...entry.steps];
      let changed = false;

      for (let i = 0; i < updatedSteps.length; i++) {
        const step = updatedSteps[i];
        if (step.status === 'done' || !step.plannedAt) continue;

        const plannedDate = new Date(step.plannedAt);
        const diffMs = plannedDate.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / (60 * 1000));

        // Debug log
        if (diffMins < 60) {
          console.log(`[TAT-Check] Flow: ${entry.flowName}, Step: ${step.what}, diffMins: ${diffMins}, plannedAt: ${step.plannedAt}, now: ${now.toISOString()}`);
        }

        // 30 min check (due if 15-30 mins left)
        if (diffMins <= 30 && diffMins > 15 && !step.notified30m) {
          const sent = await sendWhatsAppTATMsg(db, sock, step, entry.flowName, 30);
          if (sent) {
            updatedSteps[i].notified30m = true;
            changed = true;
          }
        }

        // 15 min check (due if 5-15 mins left)
        if (diffMins <= 15 && diffMins > 5 && !step.notified15m) {
          const sent = await sendWhatsAppTATMsg(db, sock, step, entry.flowName, 15);
          if (sent) {
            updatedSteps[i].notified15m = true;
            changed = true;
          }
        }

        // 5 min check (due if 0-5 mins left)
        if (diffMins <= 5 && diffMins > 0 && !step.notified5m) {
          const sent = await sendWhatsAppTATMsg(db, sock, step, entry.flowName, 5);
          if (sent) {
            updatedSteps[i].notified5m = true;
            changed = true;
          }
        }

        // Overdue check
        if (diffMins <= 0 && !step.notifiedOverdue) {
          const sent = await sendWhatsAppTATMsg(db, sock, step, entry.flowName, 0);
          if (sent) {
            updatedSteps[i].notifiedOverdue = true;
            changed = true;
          }
        }
      }

      if (changed) {
        await updateDoc(docSnapshot.ref, { steps: updatedSteps });
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error checking TAT:', err);
  }
}

async function sendWhatsAppTATMsg(db: any, sock: any, step: any, flowName: string, minutes: number): Promise<boolean> {
  try {
    let phone = '';
    if (step.whoId) {
      // Find employee by ID
      const empDocRef = doc(db, 'employees', step.whoId);
      const empSnapshot = await getDoc(empDocRef);
      if (empSnapshot.exists()) {
        phone = empSnapshot.data()?.whatsapp || '';
      } else {
        // Try searching by employeeId field
        const empQuery = query(collection(db, 'employees'), where('employeeId', '==', step.whoId));
        const empQuerySnap = await getDocs(empQuery);
        if (!empQuerySnap.empty) {
          phone = empQuerySnap.docs[0].data().whatsapp || '';
        }
      }
    }

    if (!phone) {
      return false;
    }

    const jid = getJid(phone);
    if (!jid) return false;

    let message = '';
    
    if (minutes === 0) {
      message = `⚠️ *TAT BREACH ALERT: OVERDUE*\n\nProcess: *${flowName}*\nTask: *${step.what}*\nExpected By: ${formatIST(step.plannedAt)}\n\nThis task has exceeded its designated TAT. Please complete it immediately!`;
    } else {
      message = `🔔 *TAT Reminder: ${minutes} MIN LEFT*\n\nProcess: *${flowName}*\nTask: *${step.what}*\nExpected By: ${formatIST(step.plannedAt)}\n\nPlease complete this task within the designated TAT.`;
    }
    
    await sock.sendMessage(jid, { text: message });
    console.log(`[Notification] Sent ${minutes === 0 ? 'Overdue' : minutes + 'm'} reminder to ${phone} for ${step.what}`);
    return true;
  } catch (err) {
    console.error(`[Notification] Failed to send WhatsApp:`, err);
    return false;
  }
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
