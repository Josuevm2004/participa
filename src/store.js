// Participa Store - Robust Event-Driven Sync & Aggregation Engine

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

// BroadcastChannel for local tabs
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
}

// PeerJS Instances
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

function broadcastChange(action, data) {
  const payload = { action, data, timestamp: Date.now() };
  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }
  try {
    localStorage.setItem('participa_last_event', JSON.stringify(payload));
  } catch (e) {}
}

function getRoomsData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveRoomsData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

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
// WEBRTC PEERJS (Direct Browser P2P)
// ----------------------------------------------------------------------------
function getPeerId(code) {
  const cleanCode = (code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `participa_peer_${cleanCode}`;
}

export function initTeacherPeer(roomCode) {
  if (!window.Peer || !roomCode) return;
  const peerId = getPeerId(roomCode);

  try {
    if (teacherPeer) {
      try { teacherPeer.destroy(); } catch (e) {}
    }

    teacherPeer = new window.Peer(peerId, { debug: 1 });

    teacherPeer.on('connection', (conn) => {
      connectedStudentConns.push(conn);

      conn.on('open', () => {
        const room = getRoom(roomCode);
        if (room) {
          conn.send({ type: 'ROOM_SYNC', room });
        }
      });

      conn.on('data', (data) => {
        if (data && data.type === 'SUBMIT_RESPONSE') {
          addStudentResponse(roomCode, data.studentName, data.text);
        }
      });

      conn.on('close', () => {
        connectedStudentConns = connectedStudentConns.filter(c => c !== conn);
      });
    });
  } catch (e) {}
}

function broadcastToStudents(room) {
  connectedStudentConns.forEach(conn => {
    try {
      if (conn.open) {
        conn.send({ type: 'ROOM_SYNC', room });
      }
    } catch (e) {}
  });
}

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
  } catch (e) {}
}

function sendResponseToTeacherP2P(studentName, text) {
  if (studentConn && studentConn.open) {
    try {
      studentConn.send({ type: 'SUBMIT_RESPONSE', studentName, text });
      return true;
    } catch (e) {}
  }
  return false;
}

// ----------------------------------------------------------------------------
// CLOUD EVENT AGGREGATOR ENGINE (Prevents Overwriting)
// ----------------------------------------------------------------------------
function getTopicUrl(code) {
  const cleanCode = (code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `${NTFY_BASE_URL}${cleanCode}`;
}

// Publish payload (Room snapshot or Student response event)
async function publishToCloud(code, payload) {
  if (!code || !payload) return;
  try {
    const topicUrl = getTopicUrl(code);
    await fetch(topicUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (e) {}
}

// Sync room & merge incoming student responses without losing any data
async function syncRoomWithCloud(code) {
  if (!code) return null;
  const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  try {
    const topicUrl = `${getTopicUrl(cleanCode)}/json?poll=1`;
    const res = await fetch(topicUrl);
    if (!res.ok) return null;

    const text = await res.text();
    if (!text || !text.trim()) return null;

    const lines = text.trim().split('\n');
    let rooms = getRoomsData();
    let currentRoom = rooms[cleanCode] || null;
    let hasChanges = false;

    lines.forEach(line => {
      try {
        const item = JSON.parse(line);
        if (item && item.message) {
          const payload = JSON.parse(item.message);

          // 1. Room Creation / Snapshot Event
          if (payload.type === 'ROOM_SNAPSHOT' && payload.room) {
            if (!currentRoom) {
              currentRoom = payload.room;
              hasChanges = true;
            } else {
              // Update metadata (question / title)
              if (currentRoom.question !== payload.room.question) {
                currentRoom.question = payload.room.question;
                hasChanges = true;
              }
              if (currentRoom.title !== payload.room.title) {
                currentRoom.title = payload.room.title;
                hasChanges = true;
              }
            }
          }

          // 2. Individual Student Response Event (Merge by ID)
          if (payload.type === 'STUDENT_RESPONSE' && payload.response) {
            if (!currentRoom) {
              currentRoom = {
                code: cleanCode,
                teacherName: 'Profesor',
                title: 'Aula Interactiva',
                question: '¿Qué aprendiste hoy?',
                createdAt: Date.now(),
                isActive: true,
                responses: []
              };
              hasChanges = true;
            }

            const exists = currentRoom.responses.some(r => r.id === payload.response.id);
            if (!exists) {
              currentRoom.responses.unshift(payload.response);
              hasChanges = true;
            }
          }
        }
      } catch (err) {}
    });

    if (currentRoom && hasChanges) {
      rooms[cleanCode] = currentRoom;
      saveRoomsData(rooms);
      notifyListeners(cleanCode);
    }

    return currentRoom;
  } catch (e) {}
  return null;
}

// Live polling engine (polls cloud every 2 seconds and merges responses)
let pollerActiveRoomCode = null;
setInterval(async () => {
  if (!pollerActiveRoomCode) return;
  await syncRoomWithCloud(pollerActiveRoomCode);
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
  
  initTeacherPeer(roomCode);
  publishToCloud(roomCode, { type: 'ROOM_SNAPSHOT', room: newRoom });
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
  const cloudRoom = await syncRoomWithCloud(code);
  
  if (cloudRoom) {
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
    publishToCloud(roomCode, { type: 'ROOM_SNAPSHOT', room });
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

  const responsesCount = room && room.responses ? room.responses.length : 0;
  const colorIndex = responsesCount % PASTEL_COLORS.length;

  const newResponse = {
    id: 'resp_' + Math.random().toString(36).substr(2, 9),
    studentName: studentName.trim() || 'Estudiante',
    text: responseText.trim(),
    colorIndex: colorIndex,
    createdAt: Date.now(),
    isPinned: false
  };

  if (room) {
    room.responses.unshift(newResponse);
    const rooms = getRoomsData();
    rooms[roomCode] = room;
    saveRoomsData(rooms);
  }

  // Publish ONLY the student's individual response event to cloud
  publishToCloud(roomCode, {
    type: 'STUDENT_RESPONSE',
    roomCode,
    response: newResponse
  });

  sendResponseToTeacherP2P(studentName, responseText);
  if (room) broadcastToStudents(room);
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
      publishToCloud(roomCode, { type: 'ROOM_SNAPSHOT', room });
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
    publishToCloud(roomCode, { type: 'ROOM_SNAPSHOT', room });
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
    publishToCloud(roomCode, { type: 'ROOM_SNAPSHOT', room });
    broadcastToStudents(room);
    broadcastChange('CLEAR_RESPONSES', { roomCode });
    notifyListeners(roomCode);
  }
}
