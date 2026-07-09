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
const studentSelect = document.getElementById('student-select');
const bookSelect = document.getElementById('book-select');
const dateInput = document.getElementById('date-input');
const tbody = document.getElementById('records-body');
const emptyMsg = document.getElementById('empty-msg');
const statusMsg = document.getElementById('status-msg');
const borrowForm = document.getElementById('borrow-form');
const limitWarning = document.getElementById('limit-warning');

let allRecords = [];

function populateSelect(selectElement, values) {
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

function createRecordId() {
  return window.crypto?.randomUUID?.() || `rec-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    cells[0].textContent = rec.student_name;
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
    borrow_date: new Date(dateInput.value).toISOString(),
    return_date: '',
    status: 'emprestado'
  });

  submitButton.disabled = false;
  submitButton.textContent = 'Registrar empréstimo';

  if (result.isOk) {
    showMsg('Empréstimo registrado com sucesso!', false);
  } else {
    showMsg('Erro ao registrar empréstimo.', true);
  }
});

populateSelect(studentSelect, students);
populateSelect(bookSelect, books);
dateInput.value = new Date().toISOString().split('T')[0];

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
