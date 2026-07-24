// Participa Store - WebRTC PeerJS & Cloud Sync Engine

const STORAGE_KEY = 'participa_app_rooms_v1';
const CHANNEL_NAME = 'participa_channel_v1';
const NTFY_BASE_URL = 'https://ntfy.sh/participa_room_';

// Color pastel mapping
export const PASTEL_COLORS = [
  { id: 0, name: 'Amarillo', bg: '#FFF7CC', border: '#F7E9A0' },
  { id: 1, name: 'Azul', bg: '#E6F4FF', border: '#BFE3FF' },
  { id: 2, name: 'Verde', bg: '#E6F7EE', border: '#BCEBCE' },
  { id: 3, name: 'Rosa', bg: '#FFE6EA', border: '#FFC0CB' },
  { id: 4, name: 'Lila', bg: '#F1E6FF', border: '#DBC4F0' }
];

// BroadcastChannel for local same-browser tabs
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
}

// PeerJS Realtime Instances
let teacherPeer = null;
let studentPeer = null;
let studentConn = null;
let connectedStudentConns = [];

// Memory Cache & Listeners
let listeners = [];

export function subscribeState(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

function notifyListeners(roomCode) {
  listeners.forEach(cb => cb(roomCode));
}

// Broadcast event locally
function broadcastChange(action, data) {
  const payload = { action, data, timestamp: Date.now() };
  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }
  try {
    localStorage.setItem('participa_last_event', JSON.stringify(payload));
  } catch (e) {
    console.error(e);
  }
}

// Helper: Get all rooms from localStorage
function getRoomsData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

// Helper: Save rooms to localStorage
function saveRoomsData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving room data', e);
  }
}

// Generate unique 6-character room code (e.g. PRT-728)
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  let prefix = '';
  for (let i = 0; i < 3; i++) {
    prefix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let numStr = '';
  for (let i = 0; i < 3; i++) {
    numStr += nums.charAt(Math.floor(Math.random() * nums.length));
  }
  return `${prefix}-${numStr}`;
}

// ----------------------------------------------------------------------------
// WEBRTC PEERJS MULTI-DEVICE CONNECTION (Laptop <---> Mobile Phones)
// ----------------------------------------------------------------------------
function getPeerId(code) {
  const cleanCode = (code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `participa_peer_${cleanCode}`;
}

// Teacher PeerJS Host Setup
export function initTeacherPeer(roomCode) {
  if (!window.Peer || !roomCode) return;
  const peerId = getPeerId(roomCode);

  try {
    if (teacherPeer) {
      try { teacherPeer.destroy(); } catch (e) {}
    }

    teacherPeer = new window.Peer(peerId, { debug: 1 });

    teacherPeer.on('open', (id) => {
      console.log('Teacher P2P Room Host active:', id);
    });

    teacherPeer.on('connection', (conn) => {
      connectedStudentConns.push(conn);

      // Send current room data to newly connected student
      conn.on('open', () => {
        const room = getRoom(roomCode);
        if (room) {
          conn.send({ type: 'ROOM_SYNC', room });
        }
      });

      // Handle student actions
      conn.on('data', (data) => {
        if (data && data.type === 'SUBMIT_RESPONSE') {
          addStudentResponse(roomCode, data.studentName, data.text);
        }
      });

      conn.on('close', () => {
        connectedStudentConns = connectedStudentConns.filter(c => c !== conn);
      });
    });

    teacherPeer.on('error', (err) => {
      console.warn('Teacher P2P notice:', err.type);
    });
  } catch (e) {
    console.warn('PeerJS init fallback:', e);
  }
}

// Broadcast room updates to all connected student phones
function broadcastToStudents(room) {
  connectedStudentConns.forEach(conn => {
    try {
      if (conn.open) {
        conn.send({ type: 'ROOM_SYNC', room });
      }
    } catch (e) {}
  });
}

// Student PeerJS Client Connect
export function connectStudentPeer(roomCode, onSyncCallback) {
  if (!window.Peer || !roomCode) return;
  const hostPeerId = getPeerId(roomCode);

  try {
    if (studentPeer) {
      try { studentPeer.destroy(); } catch (e) {}
    }

    studentPeer = new window.Peer();

    studentPeer.on('open', () => {
      studentConn = studentPeer.connect(hostPeerId, { reliable: true });

      studentConn.on('open', () => {
        console.log('Connected directly to Teacher room');
      });

      studentConn.on('data', (data) => {
        if (data && data.type === 'ROOM_SYNC' && data.room) {
          const rooms = getRoomsData();
          rooms[roomCode] = data.room;
          saveRoomsData(rooms);
          if (onSyncCallback) onSyncCallback(data.room);
          notifyListeners(roomCode);
        }
      });
    });
  } catch (e) {
    console.warn('Student P2P connect fallback:', e);
  }
}

// Send response directly to Teacher P2P host
function sendResponseToTeacherP2P(studentName, text) {
  if (studentConn && studentConn.open) {
    try {
      studentConn.send({
        type: 'SUBMIT_RESPONSE',
        studentName,
        text
      });
      return true;
    } catch (e) {}
  }
  return false;
}

// ----------------------------------------------------------------------------
// CLOUD BACKUP SYNC ENGINE (ntfy.sh)
// ----------------------------------------------------------------------------
function getTopicUrl(code) {
  const cleanCode = (code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `${NTFY_BASE_URL}${cleanCode}`;
}

async function publishRoomToCloud(room) {
  if (!room || !room.code) return;
  try {
    const topicUrl = getTopicUrl(room.code);
    await fetch(topicUrl, {
      method: 'POST',
      body: JSON.stringify(room)
    });
  } catch (e) {}
}

async function fetchRoomFromCloud(code) {
  if (!code) return null;
  const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  try {
    const topicUrl = `${getTopicUrl(cleanCode)}/json?poll=1`;
    const res = await fetch(topicUrl);
    if (!res.ok) return null;
    
    const text = await res.text();
    if (!text || !text.trim()) return null;

    const lines = text.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const item = JSON.parse(lines[i]);
        if (item && item.message) {
          const roomObj = JSON.parse(item.message);
          if (roomObj && roomObj.code) {
            return roomObj;
          }
        }
      } catch (err) {}
    }
  } catch (e) {}
  return null;
}

// Cloud polling interval
let pollerActiveRoomCode = null;
setInterval(async () => {
  if (!pollerActiveRoomCode) return;
  try {
    const cloudRoom = await fetchRoomFromCloud(pollerActiveRoomCode);
    if (cloudRoom) {
      const rooms = getRoomsData();
      rooms[pollerActiveRoomCode] = cloudRoom;
      saveRoomsData(rooms);
      notifyListeners(pollerActiveRoomCode);
    }
  } catch (e) {}
}, 2000);

export function setActivePollRoom(code) {
  pollerActiveRoomCode = code;
}

// ----------------------------------------------------------------------------
// PUBLIC ACTIONS
// ----------------------------------------------------------------------------

// 1. Create Room (Teacher)
export function createRoom(teacherName, roomTitle, questionText) {
  const rooms = getRoomsData();
  const roomCode = generateRoomCode();
  
  const newRoom = {
    code: roomCode,
    teacherName: teacherName.trim() || 'Profesor',
    title: roomTitle.trim() || 'Aula Interactiva',
    question: questionText.trim() || '¿Qué aprendiste en la clase de hoy?',
    createdAt: Date.now(),
    isActive: true,
    responses: []
  };

  rooms[roomCode] = newRoom;
  saveRoomsData(rooms);
  
  // Activate WebRTC & Cloud
  initTeacherPeer(roomCode);
  publishRoomToCloud(newRoom);
  setActivePollRoom(roomCode);
  broadcastChange('CREATE_ROOM', { roomCode });
  return newRoom;
}

// 2. Get Room
export function getRoom(roomCode) {
  if (!roomCode) return null;
  const rooms = getRoomsData();
  const code = roomCode.toUpperCase().trim();
  return rooms[code] || null;
}

export async function getRoomAsync(roomCode) {
  if (!roomCode) return null;
  const code = roomCode.toUpperCase().trim();

  let room = getRoom(code);
  
  // Try cloud fetch
  const cloudRoom = await fetchRoomFromCloud(code);
  if (cloudRoom) {
    const rooms = getRoomsData();
    rooms[code] = cloudRoom;
    saveRoomsData(rooms);
    setActivePollRoom(code);
    connectStudentPeer(code);
    return cloudRoom;
  }

  if (room) {
    setActivePollRoom(code);
    connectStudentPeer(code);
    return room;
  }

  return null;
}

// 3. Update Active Question (Teacher)
export function updateRoomQuestion(roomCode, newQuestion) {
  const rooms = getRoomsData();
  const room = rooms[roomCode];
  if (room) {
    room.question = newQuestion;
    saveRoomsData(rooms);
    publishRoomToCloud(room);
    broadcastToStudents(room);
    broadcastChange('UPDATE_QUESTION', { roomCode });
    notifyListeners(roomCode);
  }
}

// 4. Add Student Response
export async function addStudentResponse(roomCode, studentName, responseText) {
  let room = getRoom(roomCode);
  if (!room) {
    room = await getRoomAsync(roomCode);
  }
  if (!room) return null;

  const colorIndex = room.responses.length % PASTEL_COLORS.length;

  const newResponse = {
    id: 'resp_' + Math.random().toString(36).substr(2, 9),
    studentName: studentName.trim() || 'Estudiante',
    text: responseText.trim(),
    colorIndex: colorIndex,
    createdAt: Date.now(),
    isPinned: false
  };

  room.responses.unshift(newResponse);
  
  const rooms = getRoomsData();
  rooms[roomCode] = room;
  saveRoomsData(rooms);
  
  sendResponseToTeacherP2P(studentName, responseText);
  publishRoomToCloud(room);
  broadcastToStudents(room);
  broadcastChange('ADD_RESPONSE', { roomCode, responseId: newResponse.id });
  notifyListeners(roomCode);
  return newResponse;
}

// 5. Toggle Pin Response
export function togglePinResponse(roomCode, responseId) {
  const rooms = getRoomsData();
  const room = rooms[roomCode];
  if (room) {
    const resp = room.responses.find(r => r.id === responseId);
    if (resp) {
      resp.isPinned = !resp.isPinned;
      room.responses.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      saveRoomsData(rooms);
      publishRoomToCloud(room);
      broadcastToStudents(room);
      broadcastChange('PIN_RESPONSE', { roomCode, responseId });
      notifyListeners(roomCode);
    }
  }
}

// 6. Delete Response
export function deleteResponse(roomCode, responseId) {
  const rooms = getRoomsData();
  const room = rooms[roomCode];
  if (room) {
    room.responses = room.responses.filter(r => r.id !== responseId);
    saveRoomsData(rooms);
    publishRoomToCloud(room);
    broadcastToStudents(room);
    broadcastChange('DELETE_RESPONSE', { roomCode, responseId });
    notifyListeners(roomCode);
  }
}

// 7. Clear All Responses
export function clearAllResponses(roomCode) {
  const rooms = getRoomsData();
  const room = rooms[roomCode];
  if (room) {
    room.responses = [];
    saveRoomsData(rooms);
    publishRoomToCloud(room);
    broadcastToStudents(room);
    broadcastChange('CLEAR_RESPONSES', { roomCode });
    notifyListeners(roomCode);
  }
}
