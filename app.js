const students = [
  'Alexsandro', 'Alice', 'Arthur', 'Carlito', 'Dominic',
  'Edson', 'Estevan', 'Gregory', 'Kimberly', 'Layslla',
  'Luis', 'Matheus', 'Murillo', 'Ryan', 'Sophia',
  'Valentina', 'Vyctor', 'Vytoria', 'Weiny', 'Yohanna'
];

const books = [
  'Era uma vez uma gota de chuva', 'Se eu fosse...', 'A galinha dos vizinho e o alfabeto de sopinha', 'Lá vem o homem do saco', 'O tupi que você fala',
  'O livro das palavras grandes', 'A minha avó', 'Cai ou não cai?', 'Amendoim', 'Cocô de passarinho',
  'Pipoca, um carneirinho e um tambor', 'Menino-Arara', 'Tito, meu irmão e eu', 'O gato Pete quer dormir', 'Cadê',
  'Quando eu for grande', 'Medo de que?', 'A canoa virou', 'Será que todo mundo tem?', 'Sou pequenino',
  'A formiguinha e a neve', 'É mentira da barata', 'Um corvo torto', 'O ovo ou a galinha?', 'O elefante caiu',
  'O macaco e a mola', 'Mmmmmmmmostros', 'Conversa de bicho', 'De quem é esse bico', 'Jeremias desenha um monstro'
];

const STORAGE_KEY = 'livros-emprestimos';
const STUDENT_PROFILES_KEY = 'livros-perfis-alunos';
const studentSelect = document.getElementById('student-select');
const bookSelect = document.getElementById('book-select');
const dateInput = document.getElementById('date-input');
const photoInput = document.getElementById('student-photo');
const photoPreview = document.getElementById('student-photo-preview');
const profileCard = document.getElementById('student-profile-card');
const historyList = document.getElementById('student-history-list');
const historyCount = document.getElementById('student-history-count');
const tbody = document.getElementById('records-body');
const emptyMsg = document.getElementById('empty-msg');
const statusMsg = document.getElementById('status-msg');
const borrowForm = document.getElementById('borrow-form');
const limitWarning = document.getElementById('limit-warning');

let allRecords = [];
let studentProfiles = [];

function populateSelect(selectElement, values, placeholderText = '') {
  if (placeholderText) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = placeholderText;
    selectElement.appendChild(placeholder);
  }

  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR');
}

function getSelectedDateValue() {
  const value = dateInput.value;
  if (!value) return '';

  const [year, month, day] = value.split('-').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getStoredRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Não foi possível ler o armazenamento local:', error);
    return [];
  }
}

function saveStoredRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.warn('Não foi possível salvar no armazenamento local:', error);
  }
}

function getStoredStudentProfiles() {
  try {
    const raw = localStorage.getItem(STUDENT_PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Não foi possível ler as fotos dos alunos:', error);
    return [];
  }
}

function saveStoredStudentProfiles(profiles) {
  try {
    localStorage.setItem(STUDENT_PROFILES_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.warn('Não foi possível salvar as fotos dos alunos:', error);
  }
}

function createRecordId() {
  return window.crypto?.randomUUID?.() || `rec-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getInitials(name) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function getStudentProfile(name) {
  return studentProfiles.find((profile) => profile.name === name) || { name, photo: null };
}

function populateStudentSelect() {
  studentSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecione um aluno';
  studentSelect.appendChild(placeholder);

  studentProfiles.forEach((profile) => {
    const option = document.createElement('option');
    option.value = profile.name;
    option.textContent = profile.name;
    studentSelect.appendChild(option);
  });
}

function resetStudentPanel() {
  photoPreview.innerHTML = '<span class="text-muted">Selecione um aluno para ver a foto.</span>';
  profileCard.innerHTML = '<div class="text-muted small">Selecione um aluno para ver o perfil.</div>';
  historyList.innerHTML = '<div class="history-item text-muted">Nenhum histórico para exibir.</div>';
  historyCount.textContent = '0 empréstimos';
}

function updatePhotoPreview(studentName) {
  if (!studentName) {
    photoPreview.innerHTML = '<span class="text-muted">Selecione um aluno para ver a foto.</span>';
    return;
  }

  const profile = getStudentProfile(studentName);
  if (profile.photo) {
    photoPreview.innerHTML = `<img src="${profile.photo}" alt="Foto de ${studentName}">`;
  } else {
    photoPreview.innerHTML = `<span class="text-muted">Nenhuma foto selecionada ainda.</span>`;
  }
}

function renderStudentHistory(studentName) {
  if (!studentName) {
    resetStudentPanel();
    return;
  }

  const profile = getStudentProfile(studentName);
  const history = allRecords
    .filter((record) => record.student_name === studentName)
    .sort((a, b) => new Date(b.borrow_date) - new Date(a.borrow_date));

  const activeCount = history.filter((record) => record.status !== 'devolvido').length;
  const returnedCount = history.length - activeCount;
  historyCount.textContent = `${history.length} empréstimo${history.length === 1 ? '' : 's'}`;

  const photoMarkup = profile.photo
    ? `<img src="${profile.photo}" alt="${studentName}" class="student-avatar-image">`
    : `<span>${getInitials(studentName)}</span>`;

  profileCard.innerHTML = `
    <div class="d-flex align-items-center gap-3 mb-3">
      <div class="student-avatar large">${photoMarkup}</div>
      <div>
        <h3 class="h6 mb-1">${studentName}</h3>
        <p class="mb-0 small text-muted">${activeCount} ativo${activeCount === 1 ? '' : 's'} · ${returnedCount} devolvido${returnedCount === 1 ? '' : 's'}</p>
      </div>
    </div>
    <p class="small text-muted mb-0">Adicione uma foto para personalizar o perfil do aluno e acompanhar melhor seus empréstimos.</p>
  `;

  if (!history.length) {
    historyList.innerHTML = '<div class="history-item text-muted">Nenhum livro registrado para este aluno ainda.</div>';
    return;
  }

  historyList.innerHTML = history.map((record) => `
    <div class="history-item">
      <div class="d-flex justify-content-between gap-3">
        <div>
          <div class="fw-semibold">${record.book_title}</div>
          <div class="small text-muted">${formatDate(record.borrow_date)}</div>
        </div>
        <span class="badge-status ${record.status === 'devolvido' ? 'dev' : 'empr'}">${record.status === 'devolvido' ? 'Devolvido' : 'Emprestado'}</span>
      </div>
    </div>
  `).join('');
}

function showMsg(text, isError) {
  statusMsg.textContent = text;
  statusMsg.className = `alert ${isError ? 'alert-danger' : 'alert-success'} mt-3 mb-0`;
  statusMsg.classList.remove('d-none');

  clearTimeout(showMsg.timeout);
  showMsg.timeout = setTimeout(() => {
    statusMsg.classList.add('d-none');
  }, 3000);
}

function renderRecords(data) {
  allRecords = data;
  emptyMsg.classList.toggle('d-none', data.length > 0);

  const existing = new Map([...tbody.children].map((row) => [row.dataset.id, row]));
  const seen = new Set();

  data.forEach((rec) => {
    seen.add(rec.__backendId);

    let row = existing.get(rec.__backendId);
    if (!row) {
      row = document.createElement('tr');
      row.dataset.id = rec.__backendId;
      row.innerHTML = `
        <td></td>
        <td></td>
        <td></td>
        <td><span class="badge-status"></span></td>
        <td class="text-end">
          <button type="button" class="btn btn-outline-primary btn-sm return-btn">Devolver</button>
        </td>
      `;
      row.querySelector('.return-btn').addEventListener('click', () => handleReturn(rec.__backendId));
      tbody.appendChild(row);
    }

    const cells = row.querySelectorAll('td');
    const profile = getStudentProfile(rec.student_name);
    const avatarMarkup = profile.photo
      ? `<img src="${profile.photo}" alt="${rec.student_name}" class="student-avatar-image">`
      : `<span>${getInitials(rec.student_name)}</span>`;

    cells[0].innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <div class="student-avatar">${avatarMarkup}</div>
        <span class="fw-semibold">${rec.student_name}</span>
      </div>
    `;
    cells[1].textContent = rec.book_title;
    cells[2].textContent = formatDate(rec.borrow_date);

    const badge = cells[3].querySelector('span');
    const isReturned = rec.status === 'devolvido';
    badge.textContent = isReturned ? 'Devolvido' : 'Emprestado';
    badge.className = `badge-status ${isReturned ? 'dev' : 'empr'}`;
    row.querySelector('.return-btn').classList.toggle('d-none', isReturned);
  });

  existing.forEach((row, id) => {
    if (!seen.has(id)) row.remove();
  });

  const activeStudent = studentSelect.value || studentProfiles[0]?.name || '';
  if (activeStudent) {
    renderStudentHistory(activeStudent);
  } else {
    resetStudentPanel();
  }
}

async function handleReturn(id) {
  const rec = allRecords.find((item) => item.__backendId === id);
  if (!rec) return;

  const updatedRecord = {
    ...rec,
    status: 'devolvido',
    return_date: new Date().toISOString()
  };

  if (window.dataSdk?.update) {
    const result = await window.dataSdk.update(updatedRecord);
    if (!result.isOk) {
      showMsg('Erro ao devolver.', true);
    }
    return;
  }

  const nextRecords = getStoredRecords().map((item) => item.__backendId === id ? updatedRecord : item);
  saveStoredRecords(nextRecords);
  renderRecords(nextRecords);
  showMsg('Livro devolvido com sucesso!', false);
}

async function createRecord(payload) {
  if (window.dataSdk?.create) {
    return window.dataSdk.create(payload);
  }

  const record = {
    ...payload,
    __backendId: createRecordId()
  };
  const nextRecords = [...getStoredRecords(), record];
  saveStoredRecords(nextRecords);
  renderRecords(nextRecords);
  return { isOk: true };
}

async function updateRecord(payload) {
  if (window.dataSdk?.update) {
    return window.dataSdk.update(payload);
  }

  const nextRecords = getStoredRecords().map((item) => item.__backendId === payload.__backendId ? payload : item);
  saveStoredRecords(nextRecords);
  renderRecords(nextRecords);
  return { isOk: true };
}

borrowForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (allRecords.length >= 999) {
    limitWarning.classList.remove('d-none');
    return;
  }

  const submitButton = borrowForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Registrando...';

  const result = await createRecord({
    student_name: studentSelect.value,
    book_title: bookSelect.value,
    borrow_date: new Date(`${getSelectedDateValue()}T12:00:00`).toISOString(),
    return_date: '',
    status: 'emprestado'
  });

  submitButton.disabled = false;
  submitButton.textContent = 'Registrar empréstimo';

  if (result.isOk) {
    showMsg('Empréstimo registrado com sucesso!', false);
    borrowForm.reset();
    dateInput.value = new Date().toISOString().split('T')[0];
    photoInput.value = '';
    studentSelect.value = '';
    updatePhotoPreview('');
    renderStudentHistory('');
  } else {
    showMsg('Erro ao registrar empréstimo.', true);
  }
});

studentSelect.addEventListener('change', () => {
  if (!studentSelect.value) {
    resetStudentPanel();
    return;
  }
  updatePhotoPreview(studentSelect.value);
  renderStudentHistory(studentSelect.value);
});

photoInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const selectedStudent = studentSelect.value;
    const profile = studentProfiles.find((item) => item.name === selectedStudent);
    if (!profile) return;

    profile.photo = reader.result;
    saveStoredStudentProfiles(studentProfiles);
    updatePhotoPreview(selectedStudent);
    renderStudentHistory(selectedStudent);
    renderRecords(allRecords);
    showMsg(`Foto de ${selectedStudent} atualizada!`, false);
  };
  reader.readAsDataURL(file);
});

studentProfiles = getStoredStudentProfiles().length
  ? getStoredStudentProfiles()
  : students.map((name) => ({ name, photo: null }));

if (!studentProfiles.length) {
  studentProfiles = students.map((name) => ({ name, photo: null }));
}

saveStoredStudentProfiles(studentProfiles);
populateSelect(bookSelect, books, 'Selecione um livro');
populateStudentSelect();
dateInput.value = new Date().toISOString().split('T')[0];

studentSelect.value = '';
bookSelect.value = '';
updatePhotoPreview('');
renderStudentHistory('');

(async () => {
  const storedRecords = getStoredRecords();
  renderRecords(storedRecords);

  if (window.dataSdk?.init) {
    try {
      const result = await window.dataSdk.init({ onDataChanged: renderRecords });
      if (result?.isOk) {
        return;
      }
    } catch (error) {
      console.warn('Falha ao inicializar o SDK de dados:', error);
    }
  }

  if (!storedRecords.length) {
    showMsg('Modo local ativado. Os registros serão salvos neste navegador.', false);
  }
})();
