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
const bookDatalist = document.getElementById('book-options');
const dateInput = document.getElementById('date-input');
const photoInput = document.getElementById('student-photo');
const photoPreview = document.getElementById('student-photo-preview');
const profileCard = document.getElementById('student-profile-card');
const historyList = document.getElementById('student-history-list');
const historyCount = document.getElementById('student-history-count');
const recordsView = document.getElementById('records-view');
const emptyMsg = document.getElementById('empty-msg');
const statusMsg = document.getElementById('status-msg');
const borrowForm = document.getElementById('borrow-form');
const limitWarning = document.getElementById('limit-warning');
const viewButtons = document.querySelectorAll('[data-view]');

let allRecords = [];
let studentProfiles = [];
let editingRecordId = null;
let currentView = 'cards';

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

function populateBookDatalist(values) {
  bookDatalist.innerHTML = '';

  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    bookDatalist.appendChild(option);
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
  recordsView.className = currentView === 'list' ? 'records-list' : 'records-grid';
  recordsView.innerHTML = '';

  data.forEach((rec) => {
    const profile = getStudentProfile(rec.student_name);
    const avatarMarkup = profile.photo
      ? `<img src="${profile.photo}" alt="${rec.student_name}" class="student-avatar-image">`
      : `<span>${getInitials(rec.student_name)}</span>`;

    const card = document.createElement('div');
    card.className = 'record-card';
    card.dataset.id = rec.__backendId;
    card.innerHTML = `
      <div class="record-card-header">
        <div class="d-flex align-items-center gap-2 student-select-trigger">
          <div class="student-avatar">${avatarMarkup}</div>
          <div>
            <div class="record-card-title">${rec.student_name}</div>
            <div class="record-card-meta">${formatDate(rec.borrow_date)}</div>
          </div>
        </div>
        <span class="badge-status ${rec.status === 'devolvido' ? 'dev' : 'empr'}">${rec.status === 'devolvido' ? 'Devolvido' : 'Emprestado'}</span>
      </div>
      <div class="record-card-body">
        <div><strong>Livro:</strong> ${rec.book_title}</div>
        <div><strong>Data de empréstimo:</strong> ${formatDate(rec.borrow_date)}</div>
        <div><strong>Data de devolução:</strong> ${rec.return_date ? formatDate(rec.return_date) : '—'}</div>
      </div>
      <div class="record-card-footer">
        <div class="action-buttons">
          <button type="button" class="btn btn-outline-primary btn-sm return-btn">Devolver</button>
          <button type="button" class="btn btn-outline-secondary btn-sm edit-btn">Editar</button>
          <button type="button" class="btn btn-outline-danger btn-sm delete-btn">Excluir</button>
        </div>
      </div>
    `;

    card.querySelector('.student-select-trigger').addEventListener('click', () => {
      updatePhotoPreview(rec.student_name);
      renderStudentHistory(rec.student_name);
    });
    card.querySelector('.return-btn').addEventListener('click', () => handleReturn(rec.__backendId));
    card.querySelector('.edit-btn').addEventListener('click', () => startEditRecord(rec));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteRecord(rec.__backendId));

    const isReturned = rec.status === 'devolvido';
    card.querySelector('.return-btn').classList.toggle('d-none', isReturned);

    if (editingRecordId === rec.__backendId) {
      renderEditForm(card, rec);
    }

    recordsView.appendChild(card);
  });

  const activeStudent = studentSelect.value || studentProfiles[0]?.name || '';
  if (activeStudent) {
    renderStudentHistory(activeStudent);
  } else {
    resetStudentPanel();
  }
}

function renderEditForm(container, rec) {
  container.innerHTML = `
    <div class="edit-form-row">
      <select class="form-select form-select-sm edit-student"></select>
      <select class="form-select form-select-sm edit-book"></select>
      <input type="date" class="form-control form-control-sm edit-date">
      <select class="form-select form-select-sm edit-status">
        <option value="emprestado">Emprestado</option>
        <option value="devolvido">Devolvido</option>
      </select>
      <input type="date" class="form-control form-control-sm edit-return-date">
      <button type="button" class="btn btn-primary btn-sm save-edit">Salvar</button>
      <button type="button" class="btn btn-outline-secondary btn-sm cancel-edit">Cancelar</button>
    </div>
  `;

  const studentEdit = container.querySelector('.edit-student');
  const bookEdit = container.querySelector('.edit-book');
  const dateEdit = container.querySelector('.edit-date');
  const statusEdit = container.querySelector('.edit-status');
  const returnDateEdit = container.querySelector('.edit-return-date');

  populateSelect(studentEdit, students);
  populateSelect(bookEdit, books);
  studentEdit.value = rec.student_name;
  bookEdit.value = rec.book_title;
  dateEdit.value = rec.borrow_date ? new Date(rec.borrow_date).toISOString().split('T')[0] : '';
  statusEdit.value = rec.status || 'emprestado';
  returnDateEdit.value = rec.return_date ? new Date(rec.return_date).toISOString().split('T')[0] : '';

  statusEdit.addEventListener('change', () => {
    if (statusEdit.value !== 'devolvido') {
      returnDateEdit.value = '';
    }
  });

  container.querySelector('.save-edit').addEventListener('click', async () => {
    const returnDateValue = statusEdit.value === 'devolvido'
      ? (returnDateEdit.value ? new Date(`${returnDateEdit.value}T12:00:00`).toISOString() : new Date().toISOString())
      : '';

    const updatedRecord = {
      ...rec,
      student_name: studentEdit.value,
      book_title: bookEdit.value,
      borrow_date: new Date(`${dateEdit.value}T12:00:00`).toISOString(),
      status: statusEdit.value,
      return_date: returnDateValue
    };

    const result = await saveRecord(updatedRecord);
    if (result.isOk) {
      editingRecordId = null;
      renderRecords(getStoredRecords());
      showMsg('Registro atualizado!', false);
    } else {
      showMsg('Erro ao atualizar.', true);
    }
  });

  container.querySelector('.cancel-edit').addEventListener('click', () => {
    editingRecordId = null;
    renderRecords(getStoredRecords());
  });
}

function startEditRecord(rec) {
  editingRecordId = rec.__backendId;
  renderRecords(getStoredRecords());
}

async function deleteRecord(id) {
  const confirmed = window.confirm('Deseja excluir este registro?');
  if (!confirmed) return;

  const nextRecords = getStoredRecords().filter((item) => item.__backendId !== id);
  saveStoredRecords(nextRecords);
  renderRecords(nextRecords);
  showMsg('Registro excluído.', false);
}

async function saveRecord(updatedRecord) {
  if (window.dataSdk?.update) {
    return window.dataSdk.update(updatedRecord);
  }

  const nextRecords = getStoredRecords().map((item) => item.__backendId === updatedRecord.__backendId ? updatedRecord : item);
  saveStoredRecords(nextRecords);
  renderRecords(nextRecords);
  return { isOk: true };
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

  const selectedBook = bookSelect.value.trim();
  if (!selectedBook) {
    showMsg('Digite ou selecione um livro.', true);
    return;
  }

  const submitButton = borrowForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Registrando...';

  const result = await createRecord({
    student_name: studentSelect.value,
    book_title: selectedBook,
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

viewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentView = button.dataset.view;
    viewButtons.forEach((item) => item.classList.toggle('active', item === button));
    renderRecords(allRecords);
  });
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
populateBookDatalist(books);
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
