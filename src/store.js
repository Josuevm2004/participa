// Participa Store & Realtime Sync Engine

const STORAGE_KEY = 'participa_app_rooms_v1';
const CHANNEL_NAME = 'participa_channel_v1';

// Color pastel mapping
export const PASTEL_COLORS = [
  { id: 0, name: 'Amarillo', bg: '#FFF7CC', border: '#F7E9A0' },
  { id: 1, name: 'Azul', bg: '#E6F4FF', border: '#BFE3FF' },
  { id: 2, name: 'Verde', bg: '#E6F7EE', border: '#BCEBCE' },
  { id: 3, name: 'Rosa', bg: '#FFE6EA', border: '#FFC0CB' },
  { id: 4, name: 'Lila', bg: '#F1E6FF', border: '#DBC4F0' }
];

// BroadcastChannel instance
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
}

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

// Broadcast event to other open tabs
function broadcastChange(action, data) {
  const payload = { action, data, timestamp: Date.now() };
  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }
  // Fallback trigger localStorage storage event
  try {
    localStorage.setItem('participa_last_event', JSON.stringify(payload));
  } catch (e) {
    console.error(e);
  }
}

// Listen to incoming tab messages
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data && event.data.data && event.data.data.roomCode) {
      notifyListeners(event.data.data.roomCode);
    }
  };
}

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY || e.key === 'participa_last_event') {
    notifyListeners();
  }
});

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
  broadcastChange('CREATE_ROOM', { roomCode });
  return newRoom;
}

// 2. Get Room by Code
export function getRoom(roomCode) {
  if (!roomCode) return null;
  const rooms = getRoomsData();
  const code = roomCode.toUpperCase().trim();
  return rooms[code] || null;
}

// 3. Update Active Question (Teacher)
export function updateRoomQuestion(roomCode, newQuestion) {
  const rooms = getRoomsData();
  const room = rooms[roomCode];
  if (room) {
    room.question = newQuestion;
    saveRoomsData(rooms);
    broadcastChange('UPDATE_QUESTION', { roomCode });
    notifyListeners(roomCode);
  }
}

// 4. Add Student Response
export function addStudentResponse(roomCode, studentName, responseText) {
  const rooms = getRoomsData();
  const room = rooms[roomCode];
  if (!room) return null;

  // Calculate next pastel color (cyclical index 0..4)
  const colorIndex = room.responses.length % PASTEL_COLORS.length;

  const newResponse = {
    id: 'resp_' + Math.random().toString(36).substr(2, 9),
    studentName: studentName.trim() || 'Estudiante',
    text: responseText.trim(),
    colorIndex: colorIndex,
    createdAt: Date.now(),
    likes: 0,
    isPinned: false
  };

  room.responses.unshift(newResponse); // Newer responses first
  saveRoomsData(rooms);
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
      // Re-sort: pinned on top
      room.responses.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      saveRoomsData(rooms);
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
    broadcastChange('CLEAR_RESPONSES', { roomCode });
    notifyListeners(roomCode);
  }
}

