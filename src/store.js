// Participa Store & Cloud Sync Engine

const STORAGE_KEY = 'participa_app_rooms_v1';
const CHANNEL_NAME = 'participa_channel_v1';
const CLOUD_API_URL = 'https://crudcrud.com/api/bf71fb9227d74f989f92740fd2d23d80/rooms';

// Color pastel mapping
export const PASTEL_COLORS = [
  { id: 0, name: 'Amarillo', bg: '#FFF7CC', border: '#F7E9A0' },
  { id: 1, name: 'Azul', bg: '#E6F4FF', border: '#BFE3FF' },
  { id: 2, name: 'Verde', bg: '#E6F7EE', border: '#BCEBCE' },
  { id: 3, name: 'Rosa', bg: '#FFE6EA', border: '#FFC0CB' },
  { id: 4, name: 'Lila', bg: '#F1E6FF', border: '#DBC4F0' }
];

// BroadcastChannel instance for local same-device tabs
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
// CLOUD API SYNC HELPERS (Works across different mobile phones & computers)
// ----------------------------------------------------------------------------
async function fetchCloudRooms() {
  try {
    const res = await fetch(CLOUD_API_URL);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('Cloud sync offline fallback:', e);
    return [];
  }
}

async function saveRoomToCloud(room) {
  try {
    // Check if room already exists on cloud
    const cloudRooms = await fetchCloudRooms();
    const existing = cloudRooms.find(r => r.code === room.code);

    const payload = {
      code: room.code,
      teacherName: room.teacherName,
      title: room.title,
      question: room.question,
      createdAt: room.createdAt,
      isActive: room.isActive,
      responses: room.responses
    };

    if (existing && existing._id) {
      // Update existing record
      await fetch(`${CLOUD_API_URL}/${existing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      // Create new record
      await fetch(CLOUD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
  } catch (e) {
    console.warn('Could not sync to cloud:', e);
  }
}

// Periodic Cloud Poller (every 3 seconds) for live updates across devices
let pollerActiveRoomCode = null;
setInterval(async () => {
  if (!pollerActiveRoomCode) return;
  try {
    const cloudRooms = await fetchCloudRooms();
    const cloudRoom = cloudRooms.find(r => r.code === pollerActiveRoomCode);
    if (cloudRoom) {
      const rooms = getRoomsData();
      rooms[pollerActiveRoomCode] = {
        code: cloudRoom.code,
        teacherName: cloudRoom.teacherName,
        title: cloudRoom.title,
        question: cloudRoom.question,
        createdAt: cloudRoom.createdAt,
        isActive: cloudRoom.isActive,
        responses: cloudRoom.responses || []
      };
      saveRoomsData(rooms);
      notifyListeners(pollerActiveRoomCode);
    }
  } catch (e) {
    // Ignore polling errors
  }
}, 3000);

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
  saveRoomToCloud(newRoom);
  setActivePollRoom(roomCode);
  broadcastChange('CREATE_ROOM', { roomCode });
  return newRoom;
}

// 2. Get Room (Synchronous Local + Asynchronous Cloud fallback)
export function getRoom(roomCode) {
  if (!roomCode) return null;
  const rooms = getRoomsData();
  const code = roomCode.toUpperCase().trim();
  return rooms[code] || null;
}

export async function getRoomAsync(roomCode) {
  if (!roomCode) return null;
  const code = roomCode.toUpperCase().trim();

  // 1. Check local
  let room = getRoom(code);
  if (room) {
    setActivePollRoom(code);
    return room;
  }

  // 2. Fetch from cloud if not found locally
  try {
    const cloudRooms = await fetchCloudRooms();
    const cloudRoom = cloudRooms.find(r => r.code === code);
    if (cloudRoom) {
      const rooms = getRoomsData();
      rooms[code] = {
        code: cloudRoom.code,
        teacherName: cloudRoom.teacherName,
        title: cloudRoom.title,
        question: cloudRoom.question,
        createdAt: cloudRoom.createdAt,
        isActive: cloudRoom.isActive,
        responses: cloudRoom.responses || []
      };
      saveRoomsData(rooms);
      setActivePollRoom(code);
      return rooms[code];
    }
  } catch (e) {
    console.error('Error fetching room from cloud', e);
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
    saveRoomToCloud(room);
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

  // Calculate next pastel color (cyclical index 0..4)
  const colorIndex = room.responses.length % PASTEL_COLORS.length;

  const newResponse = {
    id: 'resp_' + Math.random().toString(36).substr(2, 9),
    studentName: studentName.trim() || 'Estudiante',
    text: responseText.trim(),
    colorIndex: colorIndex,
    createdAt: Date.now(),
    isPinned: false
  };

  room.responses.unshift(newResponse); // Newer responses first
  
  const rooms = getRoomsData();
  rooms[roomCode] = room;
  saveRoomsData(rooms);
  
  saveRoomToCloud(room);
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
      saveRoomToCloud(room);
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
    saveRoomToCloud(room);
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
    saveRoomToCloud(room);
    broadcastChange('CLEAR_RESPONSES', { roomCode });
    notifyListeners(roomCode);
  }
}
