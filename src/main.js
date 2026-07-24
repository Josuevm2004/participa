import {
  createRoom,
  getRoom,
  getRoomAsync,
  updateRoomQuestion,
  addStudentResponse,
  togglePinResponse,
  deleteResponse,
  clearAllResponses,
  setActivePollRoom,
  subscribeState,
  PASTEL_COLORS
} from './store.js';

// Application State
let currentRole = 'home'; // 'home' | 'teacher' | 'student'
let currentRoomCode = null;
let currentStudentName = '';

// DOM Elements
const views = {
  home: document.getElementById('view-home'),
  teacher: document.getElementById('view-teacher'),
  student: document.getElementById('view-student')
};

// Toast Helper
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  if (toast && toastMsg) {
    toastMsg.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }
}

// Router Switcher
function switchView(role, roomCode = null) {
  currentRole = role;
  currentRoomCode = roomCode;

  Object.keys(views).forEach(key => {
    views[key].classList.remove('active');
  });

  if (views[role]) {
    views[role].classList.add('active');
  }

  if (role === 'teacher' && roomCode) {
    setActivePollRoom(roomCode);
    renderTeacherView();
  } else if (role === 'student' && roomCode) {
    setActivePollRoom(roomCode);
    renderStudentView();
  }

  // Close any open modals
  closeAllModals();
}

// Modal Handlers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.classList.remove('open');
  });
}

document.querySelectorAll('.modal-close-btn').forEach(btn => {
  btn.addEventListener('click', closeAllModals);
});

document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeAllModals();
  });
});

// ============================================================================
// 1. HOME VIEW LOGIC & FORMS
// ============================================================================
document.getElementById('btn-open-create-modal')?.addEventListener('click', () => {
  openModal('modal-create-room');
  document.getElementById('create-teacher-name')?.focus();
});

document.getElementById('btn-open-join-modal')?.addEventListener('click', () => {
  openModal('modal-join-room');
  document.getElementById('join-student-name')?.focus();
});

// Form: Create Room (Teacher)
document.getElementById('form-create-room')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const teacherName = document.getElementById('create-teacher-name').value;
  const roomTitle = document.getElementById('create-room-title').value;
  const questionText = document.getElementById('create-question-text').value;

  const room = createRoom(teacherName, roomTitle, questionText);
  showToast(`¡Sala creada exitosamente! Código: ${room.code}`);
  switchView('teacher', room.code);
});

// Form: Join Room (Student) - Async cloud room check
document.getElementById('form-join-room')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const studentName = document.getElementById('join-student-name').value;
  const roomCode = document.getElementById('join-room-code').value.toUpperCase().trim();

  showToast('🔍 Buscando sala...');
  const room = await getRoomAsync(roomCode);
  if (!room) {
    showToast('❌ El código de sala no existe. Verifica e intenta de nuevo.');
    return;
  }

  currentStudentName = studentName;
  showToast(`¡Unido a la sala ${room.title}!`);
  switchView('student', room.code);
});

// Auto-format room code input
document.getElementById('join-room-code')?.addEventListener('input', (e) => {
  let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (val.length > 3 && !val.includes('-')) {
    val = val.substring(0, 3) + '-' + val.substring(3, 6);
  }
  e.target.value = val;
});

// ============================================================================
// 2. TEACHER VIEW LOGIC & RENDERING
// ============================================================================
function renderTeacherView() {
  const room = getRoom(currentRoomCode);
  if (!room) return;

  // Header updates
  document.getElementById('teacher-room-title').textContent = room.title;
  document.getElementById('teacher-room-code-text').textContent = room.code;
  document.getElementById('teacher-name-badge').textContent = `Profesor: ${room.teacherName}`;
  document.getElementById('teacher-question-text').textContent = room.question;

  // Count
  const count = room.responses.length;
  document.getElementById('teacher-participant-count').textContent = `${count} ${count === 1 ? 'respuesta' : 'respuestas'}`;
  document.getElementById('wall-responses-count').textContent = `${count} ${count === 1 ? 'tarjeta en pantalla' : 'tarjetas en pantalla'}`;

  // Render Response Wall Grid
  const grid = document.getElementById('responses-grid');
  grid.innerHTML = '';

  if (room.responses.length === 0) {
    grid.innerHTML = `
      <div class="wall-empty">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h4 style="font-weight: 600; font-size: 1.1rem; color: var(--color-text-main);">Esperando respuestas de los estudiantes...</h4>
        <p style="color: var(--color-text-muted); font-size: 0.9rem; max-width: 360px;">
          Comparte el código <strong style="color: var(--color-primary); font-family: monospace;">${room.code}</strong> para que tus estudiantes comiencen a responder.
        </p>
      </div>
    `;
    return;
  }

  // Render cards with alternating pastel colors
  room.responses.forEach(resp => {
    const card = document.createElement('div');
    const colorClass = `color-${resp.colorIndex % 5}`;
    card.className = `response-card ${colorClass}`;
    
    // Time format
    const timeAgo = formatTimeAgo(resp.createdAt);

    card.innerHTML = `
      <div class="response-card-header">
        <div class="student-info">
          <div class="student-avatar">${getInitials(resp.studentName)}</div>
          <div>
            <div class="student-name">${escapeHtml(resp.studentName)}</div>
            <div class="response-time">${timeAgo}</div>
          </div>
        </div>
        
        <div class="menu-container">
          <button class="card-action-btn btn-three-dots" data-id="${resp.id}" title="Opciones">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
          
          <div class="dropdown-menu" id="menu-${resp.id}">
            <button class="dropdown-item btn-action-pin" data-id="${resp.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-.51-1.37l-2.85-3.13V5.5A1.5 1.5 0 0 0 14.14 4H9.86A1.5 1.5 0 0 0 8.36 5.5v5.24L5.51 13.87A2 2 0 0 0 5 15.24Z"/></svg>
              <span>${resp.isPinned ? 'Desfijar' : 'Fijar arriba'}</span>
            </button>
            <button class="dropdown-item btn-action-copy" data-text="${escapeHtml(resp.text)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copiar texto</span>
            </button>
            <button class="dropdown-item danger btn-action-delete" data-id="${resp.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      </div>

      <div class="response-body">${escapeHtml(resp.text)}</div>

      ${resp.isPinned ? `
        <div class="response-footer">
          <span style="font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-.51-1.37l-2.85-3.13V5.5A1.5 1.5 0 0 0 14.14 4H9.86A1.5 1.5 0 0 0 8.36 5.5v5.24L5.51 13.87A2 2 0 0 0 5 15.24Z"/></svg>
            FIJADO
          </span>
        </div>
      ` : ''}
    `;

    grid.appendChild(card);
  });

  // Attach card event listeners
  attachCardEvents();
}

// Card Event Listeners & Dropdown menus
function attachCardEvents() {
  // Three dots toggle
  document.querySelectorAll('.btn-three-dots').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const menu = document.getElementById(`menu-${id}`);
      
      // Close other open menus
      document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m !== menu) m.classList.remove('show');
      });

      if (menu) menu.classList.toggle('show');
    });
  });

  // Close menus on document click
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
  });

  // Pin
  document.querySelectorAll('.btn-action-pin').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      togglePinResponse(currentRoomCode, id);
    });
  });

  // Delete
  document.querySelectorAll('.btn-action-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      deleteResponse(currentRoomCode, id);
      showToast('Tarjeta eliminada');
    });
  });

  // Copy text
  document.querySelectorAll('.btn-action-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text');
      navigator.clipboard.writeText(text);
      showToast('Texto copiado al portapapeles');
    });
  });
}

// Teacher Top Bar Actions
document.getElementById('teacher-room-code-badge')?.addEventListener('click', () => {
  if (currentRoomCode) {
    navigator.clipboard.writeText(currentRoomCode);
    showToast(`Código ${currentRoomCode} copiado al portapapeles`);
  }
});

// Edit Question
document.getElementById('btn-edit-question')?.addEventListener('click', () => {
  const room = getRoom(currentRoomCode);
  if (room) {
    document.getElementById('edit-question-input').value = room.question;
    openModal('modal-edit-question');
  }
});

document.getElementById('form-edit-question')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const newQ = document.getElementById('edit-question-input').value;
  updateRoomQuestion(currentRoomCode, newQ);
  closeAllModals();
  showToast('Pregunta de la sala actualizada');
});

// Clear Responses
document.getElementById('btn-clear-responses')?.addEventListener('click', () => {
  if (confirm('¿Estás seguro de que deseas limpiar todas las respuestas del muro?')) {
    clearAllResponses(currentRoomCode);
    showToast('Se ha limpiado el muro de respuestas');
  }
});

// Export to PDF
document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
  exportRoomToPDF();
});

function exportRoomToPDF() {
  const room = getRoom(currentRoomCode);
  if (!room) return;

  if (room.responses.length === 0) {
    showToast('⚠️ No hay respuestas grabadas aún para exportar.');
    return;
  }

  showToast('📄 Generando documento PDF...');

  // Check if jsPDF library is available
  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 18;

      // Header Banner
      doc.setFillColor(16, 163, 127); // #10A37F
      doc.rect(0, 0, pageWidth, 12, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('PARTICIPA - REPORTES DE AULA EN TIEMPO REAL', 14, 8);

      // Title & Room Details
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(32, 33, 35);
      doc.text(room.title, 14, y);

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      const dateStr = new Date().toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      doc.text(`Docente: ${room.teacherName}  |  Código de Sala: ${room.code}  |  Fecha: ${dateStr}`, 14, y);

      // Question Box
      y += 8;
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(14, y, pageWidth - 28, 20, 3, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(16, 163, 127);
      doc.text('PREGUNTA ACTIVADA:', 18, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(32, 33, 35);
      const qLines = doc.splitTextToSize(room.question, pageWidth - 36);
      doc.text(qLines, 18, y + 12);

      y += 26;

      // Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(32, 33, 35);
      doc.text(`Respuestas de los Estudiantes (${room.responses.length}):`, 14, y);

      y += 8;

      // Responses Loop
      room.responses.forEach((resp, index) => {
        const textLines = doc.splitTextToSize(resp.text, pageWidth - 42);
        const cardHeight = 14 + (textLines.length * 5);

        // Page overflow check
        if (y + cardHeight > pageHeight - 15) {
          doc.addPage();
          y = 20;
        }

        // Draw Card Background (Soft Gray / Light Pastel)
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(14, y, pageWidth - 28, cardHeight, 3, 3, 'FD');

        // Student Name & Number
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(32, 33, 35);
        doc.text(`${index + 1}. ${resp.studentName}`, 18, y + 6);

        // Date
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(new Date(resp.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), pageWidth - 22, y + 6, { align: 'right' });

        // Response Text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        doc.text(textLines, 18, y + 12);

        y += cardHeight + 4;
      });

      // Save PDF file
      const fileName = `Participa_Respuestas_${room.code}_${room.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(fileName);
      showToast('✅ ¡PDF descargado correctamente!');
      return;
    } catch (err) {
      console.error('Error generating jsPDF', err);
    }
  }

  // Fallback if jsPDF unavailable: Browser print to PDF
  window.print();
}

// Show Real Scannable QR Code
document.getElementById('btn-show-qr')?.addEventListener('click', () => {
  if (!currentRoomCode) return;
  document.getElementById('qr-modal-code-display').textContent = currentRoomCode;
  
  const qrContainer = document.getElementById('qr-code-svg');
  qrContainer.innerHTML = ''; // Clear previous QR

  // Build direct join URL with code parameter
  const joinUrl = `${window.location.origin}${window.location.pathname}?code=${currentRoomCode}`;

  if (window.QRCode) {
    new window.QRCode(qrContainer, {
      text: joinUrl,
      width: 180,
      height: 180,
      colorDark: "#202123",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.H
    });
  } else {
    qrContainer.innerHTML = generateSimpleQRSVG(currentRoomCode);
  }

  openModal('modal-qr');
});

// Exit Teacher View
document.getElementById('btn-exit-teacher')?.addEventListener('click', () => {
  if (confirm('¿Deseas salir de la sala?')) {
    switchView('home');
  }
});
document.getElementById('teacher-nav-logo')?.addEventListener('click', () => switchView('home'));

// ============================================================================
// AUTO-DETECT ROOM CODE FROM URL (?code=ABC-123)
// ============================================================================
function checkUrlRoomCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code');
  if (codeParam) {
    const formattedCode = codeParam.toUpperCase().trim();
    const joinInput = document.getElementById('join-room-code');
    if (joinInput) {
      joinInput.value = formattedCode;
      openModal('modal-join-room');
      document.getElementById('join-student-name')?.focus();
      showToast(`📍 Código de sala ${formattedCode} detectado automáticamente.`);
    }
  }
}

// Initial Landing view activate & URL check
switchView('home');
checkUrlRoomCode();

// ============================================================================
// 3. STUDENT VIEW LOGIC & SUBMISSIONS
// ============================================================================
function renderStudentView() {
  const room = getRoom(currentRoomCode);
  if (!room) return;

  document.getElementById('student-room-title').textContent = room.title;
  document.getElementById('student-name-display').textContent = currentStudentName || 'Estudiante';
  document.getElementById('student-question-text').textContent = room.question;

  // Reset inputs & visibility
  document.getElementById('student-input-container').style.display = 'flex';
  document.getElementById('student-success-container').style.display = 'none';
  document.getElementById('student-response-text').value = '';
  updateCharCounter();
}

// Character counter
const textarea = document.getElementById('student-response-text');
textarea?.addEventListener('input', updateCharCounter);

function updateCharCounter() {
  const charCount = document.getElementById('char-count');
  if (textarea && charCount) {
    charCount.textContent = textarea.value.length;
  }
}

// Submit Response (Green button)
document.getElementById('btn-submit-response')?.addEventListener('click', () => {
  const text = textarea.value.trim();
  if (!text) {
    showToast('⚠️ Por favor escribe una respuesta antes de enviar.');
    return;
  }

  addStudentResponse(currentRoomCode, currentStudentName, text);
  
  // Show success view
  document.getElementById('student-input-container').style.display = 'none';
  document.getElementById('student-success-container').style.display = 'flex';
  showToast('¡Respuesta enviada en tiempo real!');
});

// Send another response
document.getElementById('btn-send-another')?.addEventListener('click', () => {
  document.getElementById('student-input-container').style.display = 'flex';
  document.getElementById('student-success-container').style.display = 'none';
  textarea.value = '';
  updateCharCounter();
  textarea.focus();
});

document.getElementById('student-nav-logo')?.addEventListener('click', () => switchView('home'));

// ============================================================================
// 4. REAL-TIME STATE SUBSCRIBER
// ============================================================================
subscribeState((roomCode) => {
  if (currentRole === 'teacher' && currentRoomCode) {
    renderTeacherView();
  } else if (currentRole === 'student' && currentRoomCode) {
    // Update student's question in real time if teacher changes it
    const room = getRoom(currentRoomCode);
    if (room) {
      document.getElementById('student-question-text').textContent = room.question;
    }
  }
});

// ============================================================================
// HELPERS (Time formatting, Initials, Simple SVG QR)
// ============================================================================
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'Ahora mismo';
  if (seconds < 60) return `Hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} m`;
  const hours = Math.floor(minutes / 60);
  return `Hace ${hours} h`;
}

function getInitials(name) {
  if (!name) return 'E';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate simple SVG QR pattern for visual completeness
function generateSimpleQRSVG(code) {
  return `
    <svg width="160" height="160" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="white"/>
      <!-- QR Position Markers -->
      <rect x="10" y="10" width="25" height="25" fill="#202123"/>
      <rect x="14" y="14" width="17" height="17" fill="white"/>
      <rect x="18" y="18" width="9" height="9" fill="#10A37F"/>

      <rect x="65" y="10" width="25" height="25" fill="#202123"/>
      <rect x="69" y="14" width="17" height="17" fill="white"/>
      <rect x="73" y="18" width="9" height="9" fill="#10A37F"/>

      <rect x="10" y="65" width="25" height="25" fill="#202123"/>
      <rect x="14" y="69" width="17" height="17" fill="white"/>
      <rect x="18" y="73" width="9" height="9" fill="#10A37F"/>

      <!-- Data Dots -->
      <rect x="42" y="15" width="6" height="6" fill="#202123"/>
      <rect x="50" y="25" width="6" height="6" fill="#202123"/>
      <rect x="42" y="35" width="6" height="6" fill="#10A37F"/>
      <rect x="15" y="42" width="6" height="6" fill="#202123"/>
      <rect x="25" y="50" width="6" height="6" fill="#202123"/>
      <rect x="42" y="48" width="8" height="8" fill="#10A37F"/>
      <rect x="55" y="48" width="6" height="6" fill="#202123"/>
      <rect x="68" y="42" width="6" height="6" fill="#202123"/>
      <rect x="80" y="52" width="6" height="6" fill="#10A37F"/>
      <rect x="48" y="65" width="6" height="6" fill="#202123"/>
      <rect x="60" y="70" width="8" height="8" fill="#202123"/>
      <rect x="75" y="75" width="8" height="8" fill="#10A37F"/>
    </svg>
  `;
}

// Initial Landing view activate
switchView('home');
