// Participa Store - Connected to Java Spring Boot Backend (Azure SQL) & Real-time Sync

const API_BASE_URL = window.PARTICIPA_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080/api'
    : 'https://api-participa-backend-dmf5edfjhudjbucb.centralus-01.azurewebsites.net/api'
);

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

// Memory Cache & Listeners
let listeners = [];
let pollerActiveRoomCode = null;

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
  } catch (e) { }
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
  } catch (e) { }
}

export function formatCodeWithHyphen(code) {
  if (!code) return '';
  const clean = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length === 6) {
    return clean.substring(0, 3) + '-' + clean.substring(3, 6);
  }
  return clean;
}

function updateLocalRoomCache(room) {
  if (!room || !room.code) return;
  const rooms = getRoomsData();
  const formatted = formatCodeWithHyphen(room.code);
  rooms[formatted] = room;
  rooms[room.code.toUpperCase()] = room;
  saveRoomsData(rooms);
  notifyListeners(formatted);
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
// WEBRTC PEERJS FALLBACKS
// ----------------------------------------------------------------------------
let teacherPeer = null;
let studentPeer = null;

function getPeerId(code) {
  const cleanCode = (code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `participa_peer_${cleanCode}`;
}

export function initTeacherPeer(roomCode) {
  if (!window.Peer || !roomCode) return;
  const peerId = getPeerId(roomCode);
  try {
    if (teacherPeer) {
      try { teacherPeer.destroy(); } catch (e) { }
    }
    teacherPeer = new window.Peer(peerId, { debug: 1 });
  } catch (e) { }
}

export function connectStudentPeer(roomCode, onSyncCallback) {
  if (!window.Peer || !roomCode) return;
  const hostPeerId = getPeerId(roomCode);
  try {
    if (studentPeer) {
      try { studentPeer.destroy(); } catch (e) { }
    }
    studentPeer = new window.Peer();
  } catch (e) { }
}

// Live polling engine (polls backend Spring Boot & Cloud fallback every 1.5 seconds)
setInterval(async () => {
  if (!pollerActiveRoomCode) return;
  await syncRoomWithBackend(pollerActiveRoomCode);
}, 1500);

export function setActivePollRoom(code) {
  if (code) {
    pollerActiveRoomCode = formatCodeWithHyphen(code);
    syncRoomWithBackend(pollerActiveRoomCode);
  } else {
    pollerActiveRoomCode = null;
  }
}

// ----------------------------------------------------------------------------
// BACKEND API SYNC & HYBRID FALLBACK ENGINE
// ----------------------------------------------------------------------------
async function syncRoomWithBackend(code) {
  if (!code) return null;
  const formattedCode = formatCodeWithHyphen(code);

  try {
    const res = await fetch(`${API_BASE_URL}/rooms/${formattedCode}`);
    if (res.ok) {
      const roomData = await res.json();
      if (roomData && roomData.code) {
        updateLocalRoomCache(roomData);
        return roomData;
      }
    }
  } catch (e) {
    // Backend offline fallback - try cloud ntfy
  }

  return await syncRoomWithCloud(formattedCode);
}

async function syncRoomWithCloud(code) {
  if (!code) return null;
  const formattedCode = formatCodeWithHyphen(code);
  const cleanTopicCode = formattedCode.replace(/[^a-zA-Z0-9]/g, '');

  try {
    const topicUrl = `${NTFY_BASE_URL}${cleanTopicCode}/json?poll=1`;
    const res = await fetch(topicUrl);
    if (!res.ok) return null;

    const text = await res.text();
    if (!text || !text.trim()) return null;

    const lines = text.trim().split('\n');
    let rooms = getRoomsData();
    let currentRoom = rooms[formattedCode] || null;
    let hasChanges = false;

    lines.forEach(line => {
      try {
        const item = JSON.parse(line);
        if (item && item.message) {
          const payload = JSON.parse(item.message);

          if (payload.type === 'ROOM_SNAPSHOT' && payload.room) {
            if (!currentRoom) {
              currentRoom = payload.room;
              hasChanges = true;
            } else {
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

          if (payload.type === 'STUDENT_RESPONSE' && payload.response) {
            if (!currentRoom) {
              currentRoom = {
                code: formattedCode,
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
      } catch (err) { }
    });

    if (currentRoom && hasChanges) {
      rooms[formattedCode] = currentRoom;
      saveRoomsData(rooms);
      notifyListeners(formattedCode);
    }

    return currentRoom;
  } catch (e) { }
  return null;
}

// ----------------------------------------------------------------------------
// PUBLIC ACTIONS (BACKEND CONNECTED & SYNCHRONOUS UI COMPATIBLE)
// ----------------------------------------------------------------------------

// 1. Create Room (Teacher)
export function createRoom(teacherName, roomTitle, questionText) {
  const tName = teacherName.trim() || 'Profesor';
  const rTitle = roomTitle.trim() || 'Aula Interactiva';
  const qText = questionText.trim() || '¿Qué aprendiste en la clase de hoy?';

  const rooms = getRoomsData();
  const roomCode = generateRoomCode();

  const newRoom = {
    code: roomCode,
    teacherName: tName,
    title: rTitle,
    question: qText,
    createdAt: Date.now(),
    isActive: true,
    responses: []
  };

  updateLocalRoomCache(newRoom);
  setActivePollRoom(roomCode);
  broadcastChange('CREATE_ROOM', { roomCode });

  // Sync with Spring Boot backend asynchronously
  fetch(`${API_BASE_URL}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      code: roomCode,
      teacherName: tName,
      title: rTitle,
      question: qText
    })
  })
    .then(res => res.ok ? res.json() : null)
    .then(backendRoom => {
      if (backendRoom && backendRoom.code) {
        updateLocalRoomCache(backendRoom);
        setActivePollRoom(backendRoom.code);
      }
    })
    .catch(e => {
      console.warn('Backend unavailable during createRoom, using local room state:', e);
    });

  return newRoom;
}

// 2. Get Room
export function getRoom(roomCode) {
  if (!roomCode) return null;
  const rooms = getRoomsData();
  const rawCode = roomCode.toUpperCase().trim();
  const formattedCode = formatCodeWithHyphen(rawCode);
  const cleanCode = rawCode.replace(/[^a-zA-Z0-9]/g, '');

  return rooms[formattedCode] || rooms[rawCode] || rooms[cleanCode] || null;
}

export async function getRoomAsync(roomCode) {
  if (!roomCode) return null;
  const formattedCode = formatCodeWithHyphen(roomCode);

  let room = getRoom(formattedCode);
  const backendRoom = await syncRoomWithBackend(formattedCode);

  if (backendRoom) {
    setActivePollRoom(formattedCode);
    return backendRoom;
  }

  if (room) {
    setActivePollRoom(formattedCode);
    return room;
  }

  return null;
}

// 3. Update Active Question (Teacher)
export function updateRoomQuestion(roomCode, newQuestion) {
  if (!roomCode) return;
  const code = formatCodeWithHyphen(roomCode);
  const qText = newQuestion.trim();

  const rooms = getRoomsData();
  const room = getRoom(code);
  if (room) {
    room.question = qText;
    updateLocalRoomCache(room);
  }

  fetch(`${API_BASE_URL}/rooms/${code}/question`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ question: qText })
  })
    .then(res => res.ok ? res.json() : null)
    .then(updatedRoom => {
      if (updatedRoom) updateLocalRoomCache(updatedRoom);
    })
    .catch(e => {
      console.warn('Backend error on updateRoomQuestion:', e);
    });

  broadcastChange('UPDATE_QUESTION', { roomCode: code });
}

// 4. Add Student Response
export function addStudentResponse(roomCode, studentName, responseText) {
  if (!roomCode) return null;
  const code = formatCodeWithHyphen(roomCode);
  const sName = studentName.trim() || 'Estudiante';
  const text = responseText.trim();

  let room = getRoom(code);

  const responsesCount = room && room.responses ? room.responses.length : 0;
  const colorIndex = responsesCount % PASTEL_COLORS.length;

  const tempResponse = {
    id: 'resp_' + Math.random().toString(36).substr(2, 9),
    studentName: sName,
    text: text,
    colorIndex: colorIndex,
    createdAt: Date.now(),
    isPinned: false
  };

  if (room) {
    room.responses.unshift(tempResponse);
    updateLocalRoomCache(room);
  }

  fetch(`${API_BASE_URL}/rooms/${code}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      studentName: sName,
      text: text
    })
  })
    .then(res => res.ok ? res.json() : null)
    .then(createdResponse => {
      if (createdResponse) syncRoomWithBackend(code);
    })
    .catch(e => {
      console.warn('Backend unavailable on addStudentResponse:', e);
    });

  broadcastChange('ADD_RESPONSE', { roomCode: code, responseId: tempResponse.id });
  return tempResponse;
}

// 5. Toggle Pin Response
export function togglePinResponse(roomCode, responseId) {
  if (!roomCode) return;
  const code = formatCodeWithHyphen(roomCode);

  const room = getRoom(code);
  if (room) {
    const resp = room.responses.find(r => r.id === responseId);
    if (resp) {
      resp.isPinned = !resp.isPinned;
      room.responses.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      updateLocalRoomCache(room);
    }
  }

  fetch(`${API_BASE_URL}/responses/${responseId}/pin`, {
    method: 'PUT'
  })
    .then(res => res.ok ? syncRoomWithBackend(code) : null)
    .catch(e => console.warn('Backend error on togglePinResponse:', e));

  broadcastChange('PIN_RESPONSE', { roomCode: code, responseId });
}

// 6. Delete Response
export function deleteResponse(roomCode, responseId) {
  if (!roomCode) return;
  const code = formatCodeWithHyphen(roomCode);

  const room = getRoom(code);
  if (room) {
    room.responses = room.responses.filter(r => r.id !== responseId);
    updateLocalRoomCache(room);
  }

  fetch(`${API_BASE_URL}/responses/${responseId}`, {
    method: 'DELETE'
  })
    .then(res => res.ok ? syncRoomWithBackend(code) : null)
    .catch(e => console.warn('Backend error on deleteResponse:', e));

  broadcastChange('DELETE_RESPONSE', { roomCode: code, responseId });
}

// 7. Clear All Responses
export function clearAllResponses(roomCode) {
  if (!roomCode) return;
  const code = formatCodeWithHyphen(roomCode);

  const room = getRoom(code);
  if (room) {
    room.responses = [];
    updateLocalRoomCache(room);
  }

  fetch(`${API_BASE_URL}/rooms/${code}/responses`, {
    method: 'DELETE'
  })
    .then(res => res.ok ? syncRoomWithBackend(code) : null)
    .catch(e => console.warn('Backend error on clearAllResponses:', e));

  broadcastChange('CLEAR_RESPONSES', { roomCode: code });
}
