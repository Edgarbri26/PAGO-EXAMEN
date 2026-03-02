import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { createIcons, icons } from 'lucide';

const CASH_REFERENCE = '777777';

export default function AdminPageIsland() {
  useEffect(() => {
    createIcons({ icons });

    const addExamForm = document.getElementById('add-exam-form');
    const examsList = document.getElementById('exams-list');
    const pendingPaymentsList = document.getElementById('pending-payments-list');
    const paymentsExamFilter = document.getElementById('payments-exam-filter');
    const paymentsByExamList = document.getElementById('payments-by-exam-list');
    const copyExamListBtn = document.getElementById('copy-exam-list-btn');
    const paymentEditSection = document.getElementById('payment-edit-section');
    const editPaymentType = document.getElementById('edit-payment-type');
    const editPaymentReferenceWrap = document.getElementById('edit-payment-reference-wrap');
    const editPaymentNames = document.getElementById('edit-payment-names');
    const editPaymentReference = document.getElementById('edit-payment-reference');
    const editPaymentNote = document.getElementById('edit-payment-note');
    const editPaymentStatus = document.getElementById('edit-payment-status');
    const formTitle = document.getElementById('form-title');
    const btnText = document.getElementById('btn-text');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const examIdInput = document.getElementById('exam-id');

    let allPaymentsForExam = [];
    let editingPaymentId = null;
    let availablePaymentTypes = [];

    function getPaymentTypeById(id) {
      return availablePaymentTypes.find((type) => type.id === id) || null;
    }

    function updateEditReferenceVisibility() {
      const selectedType = getPaymentTypeById(editPaymentType.value);
      const requiresReference = selectedType?.requires_reference ?? true;

      if (requiresReference) {
        editPaymentReferenceWrap.classList.remove('hidden');
      } else {
        editPaymentReferenceWrap.classList.add('hidden');
        editPaymentReference.value = CASH_REFERENCE;
      }
    }

    async function loadPaymentTypes() {
      const { data, error } = await supabase
        .from('payment_types')
        .select('id, code, name, requires_reference, active')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) {
        availablePaymentTypes = [];
        editPaymentType.innerHTML = '<option value="">Error cargando tipos</option>';
        updateEditReferenceVisibility();
        return;
      }

      availablePaymentTypes = data || [];
      editPaymentType.innerHTML = '';

      if (!availablePaymentTypes.length) {
        editPaymentType.innerHTML = '<option value="">Sin tipos de pago</option>';
        updateEditReferenceVisibility();
        return;
      }

      availablePaymentTypes.forEach((type) => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        editPaymentType.appendChild(option);
      });

      const defaultType = availablePaymentTypes.find((type) => type.code === 'pago_movil') || availablePaymentTypes[0];
      if (defaultType) {
        editPaymentType.value = defaultType.id;
      }

      updateEditReferenceVisibility();
    }

    async function loadPendingPayments() {
      pendingPaymentsList.innerHTML = '<p class="text-gray-400">Cargando pagos...</p>';

      const { data } = await supabase
        .from('payments')
        .select('*, exams(title), payment_types(id, code, name, requires_reference)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (data) {
        pendingPaymentsList.innerHTML = '';
        if (data.length === 0) {
          pendingPaymentsList.innerHTML = '<p class="text-gray-500 italic">No hay pagos pendientes de revisión.</p>';
          return;
        }

        data.forEach((p) => {
          const item = document.createElement('div');
          item.className = 'bg-gray-700 p-4 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-650 transition';
          const examTitle = p.exams ? p.exams.title : 'Examen eliminado';
          const paymentTypeName = p.payment_types ? p.payment_types.name : 'Sin tipo';
          const noteHtml = p.note ? `<div class="mt-2 p-2 bg-gray-800 rounded text-sm text-yellow-100 border-l-2 border-yellow-500"><span class="font-bold text-xs uppercase text-yellow-500 block">Nota del usuario:</span>${p.note}</div>` : '';
          const referenceText = p.reference ? `<span class="font-mono text-yellow-300">${p.reference}</span>` : '<span class="text-gray-400 italic">Sin referencia</span>';

          item.innerHTML = `
            <div class="flex-1">
              <div class="font-bold text-white text-lg">${p.names}</div>
              <div class="text-sm text-gray-300">Ref: ${referenceText}</div>
              <div class="text-xs text-gray-400 mt-1">Tipo: <span class="text-white">${paymentTypeName}</span></div>
              <div class="text-xs text-gray-400 mt-1">Examen: <span class="text-white">${examTitle}</span> (Bs ${p.amount})</div>
              ${noteHtml}
              <div class="text-xs text-gray-500 mt-1">${new Date(p.created_at).toLocaleString()}</div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto self-start md:self-center">
              <button onclick="updatePaymentStatus('${p.id}', 'approved')" class="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm flex items-center gap-1 justify-center shadow-lg transform transition hover:scale-105">
                <i data-lucide="check" class="w-4 h-4"></i> Aprobar
              </button>
              <button onclick="updatePaymentStatus('${p.id}', 'rejected')" class="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm flex items-center gap-1 justify-center shadow-lg transform transition hover:scale-105">
                <i data-lucide="x" class="w-4 h-4"></i> Rechazar
              </button>
              <button onclick="deletePayment('${p.id}')" class="w-full bg-red-800 hover:bg-red-900 text-white px-3 py-2 rounded text-sm flex items-center gap-1 justify-center shadow-lg transform transition hover:scale-105">
                <i data-lucide="trash-2" class="w-4 h-4"></i> Eliminar
              </button>
            </div>
          `;
          pendingPaymentsList.appendChild(item);
        });
        createIcons({ icons });
      }
    }

    async function loadPaymentExamFilter() {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, active')
        .order('title', { ascending: true });

      if (error) {
        paymentsExamFilter.innerHTML = '<option value="">Error cargando exámenes</option>';
        paymentsByExamList.innerHTML = '<p class="text-red-400">No se pudo cargar el filtro de exámenes.</p>';
        return;
      }

      if (!data || data.length === 0) {
        paymentsExamFilter.innerHTML = '<option value="">No hay exámenes</option>';
        paymentsByExamList.innerHTML = '<p class="text-gray-400 italic">No hay exámenes para listar pagos.</p>';
        return;
      }

      const currentValue = paymentsExamFilter.value;
      paymentsExamFilter.innerHTML = '<option value="all">Todos los exámenes</option>';
      data.forEach((exam) => {
        const option = document.createElement('option');
        option.value = exam.id;
        option.textContent = `${exam.title}${exam.active ? '' : ' (Inactivo)'}`;
        paymentsExamFilter.appendChild(option);
      });

      const exists = data.some((exam) => exam.id === currentValue);
      paymentsExamFilter.value = exists ? currentValue : data[0].id;
      loadPaymentsByExam();
    }

    async function loadPaymentsByExam() {
      const selectedExamId = paymentsExamFilter.value;
      paymentsByExamList.innerHTML = '<p class="text-gray-400">Cargando pagos del examen...</p>';

      let query = supabase
        .from('payments')
        .select('id, names, reference, note, status, amount, created_at, exam_id, payment_type_id, exams(title), payment_types(id, code, name, requires_reference)')
        .order('created_at', { ascending: false });

      if (selectedExamId && selectedExamId !== 'all') {
        query = query.eq('exam_id', selectedExamId);
      }

      const { data, error } = await query;

      if (error) {
        paymentsByExamList.innerHTML = '<p class="text-red-400">Error cargando pagos por examen.</p>';
        return;
      }

      allPaymentsForExam = data || [];
      paymentsByExamList.innerHTML = '';

      if (!allPaymentsForExam.length) {
        paymentsByExamList.innerHTML = '<p class="text-gray-500 italic">No hay pagos para este examen.</p>';
        return;
      }

      allPaymentsForExam.forEach((payment) => {
        const item = document.createElement('div');
        item.className = 'bg-gray-700 p-4 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-3';

        const statusColor = payment.status === 'approved'
          ? 'text-green-300 bg-green-900/50'
          : payment.status === 'rejected'
            ? 'text-red-300 bg-red-900/50'
            : 'text-yellow-300 bg-yellow-900/50';

        const noteText = payment.note ? `<div class="text-xs text-gray-300 mt-1">Nota: ${payment.note}</div>` : '';
        const examTitle = payment.exams ? payment.exams.title : 'Examen';
        const paymentTypeName = payment.payment_types ? payment.payment_types.name : 'Sin tipo';
        const referenceText = payment.reference ? payment.reference : 'Sin referencia';

        item.innerHTML = `
          <div class="flex-1">
            <div class="font-semibold text-white">${payment.names}</div>
            <div class="text-xs text-gray-300 mt-1">Ref: ${referenceText} · Tipo: ${paymentTypeName} · Examen: ${examTitle}</div>
            <div class="text-xs text-gray-400 mt-1">${new Date(payment.created_at).toLocaleString()} · Monto: Bs ${payment.amount}</div>
            ${noteText}
          </div>
          <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span class="px-2 py-1 rounded text-xs font-medium ${statusColor}">${payment.status}</span>
            <button onclick="editPayment('${payment.id}')" class="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-1">
              <i data-lucide="pencil" class="w-4 h-4"></i>
              Editar
            </button>
            <button onclick="deletePayment('${payment.id}')" class="flex-1 sm:flex-none bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-1">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
              Eliminar
            </button>
          </div>
        `;

        paymentsByExamList.appendChild(item);
      });

      createIcons({ icons });
    }

    async function loadExams() {
      examsList.innerHTML = '<p>Cargando...</p>';
      const { data } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        examsList.innerHTML = '';
        if (data.length === 0) examsList.innerHTML = '<p>No hay exámenes registrados.</p>';

        data.forEach((exam) => {
          const item = document.createElement('div');
          item.className = 'bg-gray-700 p-3 rounded flex justify-between items-center group hover:bg-gray-600 transition';

          const safeTitle = exam.title.replace(/'/g, "\\'");
          const safeDesc = (exam.description || '').replace(/'/g, "\\'");

          item.innerHTML = `
            <div class="flex-1">
              <div class="font-bold text-white flex items-center gap-2">
                ${exam.title}
                <span class="text-xs px-2 py-0.5 rounded ${exam.active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">
                  ${exam.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div class="text-xs text-gray-400 mt-1">Bs ${exam.price}</div>
            </div>
            <div class="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <button onclick="editExam('${exam.id}', '${safeTitle}', '${safeDesc}', '${exam.price}')" class="p-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white" title="Editar">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
              </button>
              <button onclick="toggleActive('${exam.id}', ${exam.active})" class="p-2 ${exam.active ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} rounded text-white" title="${exam.active ? 'Desactivar' : 'Activar'}">
                <i data-lucide="${exam.active ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>
              </button>
            </div>
          `;
          examsList.appendChild(item);
        });

        createIcons({ icons });
        loadPaymentExamFilter();
      }
    }

    async function copyExamNamesList() {
      if (!allPaymentsForExam.length) {
        alert('No hay pagos para copiar en este examen.');
        return;
      }

      const numberedList = allPaymentsForExam
        .map((payment, index) => `${index + 1}. ${payment.names}`)
        .join('\n');

      try {
        await navigator.clipboard.writeText(numberedList);
        alert('Lista enumerada copiada al portapapeles.');
      } catch {
        alert('No se pudo copiar la lista.');
      }
    }

    async function deletePayment(id) {
      if (!id) return;

      const confirmed = confirm('¿Seguro que deseas eliminar este pago? Esta acción no se puede deshacer.');
      if (!confirmed) return;

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`Error al eliminar pago: ${error.message}`);
        return;
      }

      if (editingPaymentId === id) {
        cancelPaymentEdit();
      }

      alert('Pago eliminado correctamente.');
      loadPendingPayments();
      loadPaymentsByExam();
    }

    function cancelPaymentEdit() {
      editingPaymentId = null;
      paymentEditSection.classList.add('hidden');
    }

    window.updatePaymentStatus = async (id, newStatus) => {
      if (!confirm(`¿Estás seguro de marcar este pago como ${newStatus === 'approved' ? 'APROBADO' : 'RECHAZADO'}?`)) return;

      const { error } = await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        alert(`Error al actualizar: ${error.message}`);
      } else {
        loadPendingPayments();
        loadPaymentsByExam();
      }
    };

    window.editPayment = (id) => {
      const payment = allPaymentsForExam.find((p) => p.id === id);
      if (!payment) {
        alert('No se encontró el pago a editar.');
        return;
      }

      editingPaymentId = id;
      editPaymentNames.value = payment.names || '';
      editPaymentReference.value = payment.reference || '';
      editPaymentNote.value = payment.note || '';
      editPaymentStatus.value = payment.status || 'pending';
      if (payment.payment_type_id) {
        editPaymentType.value = payment.payment_type_id;
      }
      updateEditReferenceVisibility();
      paymentEditSection.classList.remove('hidden');
      paymentEditSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    window.cancelPaymentEdit = cancelPaymentEdit;

    window.savePaymentEdit = async () => {
      if (!editingPaymentId) return;

      const selectedType = getPaymentTypeById(editPaymentType.value);
      if (!selectedType) {
        alert('Selecciona un tipo de pago válido.');
        return;
      }

      const requiresReference = selectedType.requires_reference;
      const trimmedReference = editPaymentReference.value.trim();

      if (requiresReference && !trimmedReference) {
        alert('La referencia es obligatoria para este tipo de pago.');
        return;
      }

      const updates = {
        names: editPaymentNames.value.trim(),
        reference: requiresReference ? trimmedReference : CASH_REFERENCE,
        note: editPaymentNote.value.trim(),
        status: editPaymentStatus.value,
        payment_type_id: selectedType.id,
      };

      const { error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', editingPaymentId);

      if (error) {
        alert(`Error al guardar cambios: ${error.message}`);
        return;
      }

      alert('Pago actualizado correctamente.');
      cancelPaymentEdit();
      loadPendingPayments();
      loadPaymentsByExam();
    };

    window.deleteCurrentPayment = async () => {
      if (!editingPaymentId) {
        alert('Selecciona un pago para eliminar.');
        return;
      }

      await deletePayment(editingPaymentId);
    };

    window.deletePayment = deletePayment;

    window.editExam = (id, title, desc, price) => {
      examIdInput.value = id;
      document.getElementById('exam-title').value = title;
      document.getElementById('exam-desc').value = desc;
      document.getElementById('exam-price').value = price;

      formTitle.textContent = 'Editar Examen';
      btnText.textContent = 'Actualizar Examen';
      cancelEditBtn.classList.remove('hidden');

      addExamForm.scrollIntoView({ behavior: 'smooth' });
    };

    window.resetForm = () => {
      addExamForm.reset();
      examIdInput.value = '';
      formTitle.textContent = 'Agregar Nuevo Examen';
      btnText.textContent = 'Guardar Examen';
      cancelEditBtn.classList.add('hidden');
    };

    window.toggleActive = async (id, currentStatus) => {
      const { error } = await supabase
        .from('exams')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        loadExams();
      }
    };

    paymentsExamFilter.addEventListener('change', loadPaymentsByExam);
    copyExamListBtn.addEventListener('click', copyExamNamesList);
    editPaymentType.addEventListener('change', updateEditReferenceVisibility);

    addExamForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = examIdInput.value;
      const title = document.getElementById('exam-title').value;
      const description = document.getElementById('exam-desc').value;
      const price = document.getElementById('exam-price').value;
      let error = null;

      if (id) {
        const { error: err } = await supabase
          .from('exams')
          .update({ title, description, price })
          .eq('id', id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('exams')
          .insert([{ title, description, price }]);
        error = err;
      }

      if (error) {
        alert(`Error al guardar: ${error.message}`);
      } else {
        alert(id ? 'Examen actualizado' : 'Examen creado');
        window.resetForm();
        loadExams();
      }
    });


    const onAuthState = (event) => {
      const session = event.detail?.session;
      if (session) {
        loadPaymentTypes();
        loadExams();
        loadPendingPayments();
        loadPaymentExamFilter();
      } else {
        allPaymentsForExam = [];
        editingPaymentId = null;
        examsList.innerHTML = '';
        pendingPaymentsList.innerHTML = '';
        paymentsByExamList.innerHTML = '';
        paymentsExamFilter.innerHTML = '<option value="">Inicia sesión para cargar exámenes</option>';
        editPaymentType.innerHTML = '<option value="">Inicia sesión para cargar tipos</option>';
        paymentEditSection.classList.add('hidden');
      }
    };

    window.addEventListener('admin-auth-state', onAuthState);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        onAuthState({ detail: { session } });
      }
    });

    return () => {
      paymentsExamFilter.removeEventListener('change', loadPaymentsByExam);
      copyExamListBtn.removeEventListener('click', copyExamNamesList);
      editPaymentType.removeEventListener('change', updateEditReferenceVisibility);
      window.removeEventListener('admin-auth-state', onAuthState);
    };
  }, []);

  return null;
}
