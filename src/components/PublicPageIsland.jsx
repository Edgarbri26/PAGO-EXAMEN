import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { createIcons, icons } from 'lucide';

export default function PublicPageIsland() {
  useEffect(() => {
    createIcons({ icons });

    window.selectedExamState = null;

    const payersList = document.getElementById('payers-list');
    const examsContainer = document.getElementById('exams-container');
    const amountDisplay = document.getElementById('amount-display');
    const payButton = document.getElementById('pay-button');

    async function loadExams() {
      examsContainer.innerHTML = '<p class="text-slate-400 italic">Cargando...</p>';

      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        examsContainer.innerHTML = '<p class="text-red-400">Error al cargar exámenes.</p>';
        return;
      }

      if (!data || data.length === 0) {
        examsContainer.innerHTML = '<p class="text-slate-400">No hay exámenes activos en este momento.</p>';
        return;
      }

      examsContainer.innerHTML = '';
      data.forEach((exam) => {
        const el = document.createElement('div');
        el.className = 'cursor-pointer border border-slate-600 bg-slate-800 p-4 rounded-lg hover:border-indigo-500 transition-all exam-card';
        el.onclick = () => selectExam(exam.id, exam.price, exam.title, el);

        el.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h3 class="font-bold text-base sm:text-lg text-white break-words">${exam.title}</h3>
            <span class="text-emerald-400 font-bold text-lg sm:text-xl">Bs ${exam.price}</span>
          </div>
          <p class="text-slate-400 text-sm mt-1">${exam.description || ''}</p>
        `;

        examsContainer.appendChild(el);
      });

      createIcons({ icons });
    }

    function selectExam(id, price, title, element) {
      window.selectedExamState = { id, price, title };

      document.querySelectorAll('.exam-card').forEach((card) => {
        card.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-900/20');
        card.classList.add('bg-slate-800');
      });

      element.classList.remove('bg-slate-800');
      element.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-900/20');

      amountDisplay.textContent = `Bs ${price}`;

      payButton.disabled = false;
      payButton.classList.remove('bg-slate-600', 'cursor-not-allowed');
      payButton.classList.add('bg-emerald-500', 'hover:bg-emerald-600', 'shadow-emerald-500/30', 'hover:-translate-y-1');
      payButton.innerHTML = `<i data-lucide="check-circle" class="w-6 h-6"></i> ¡Ya pagué el de ${title}!`;
      createIcons({ icons });
    }

    async function loadPayments() {
      payersList.innerHTML = '<p class="text-center text-slate-500 py-4 italic">Cargando lista...</p>';

      const { data, error } = await supabase
        .from('payments')
        .select('names, reference, created_at, status, exams!inner(title, active)')
        .in('status', ['approved', 'pending'])
        .eq('exams.active', true)
        .order('created_at', { ascending: false });

      payersList.innerHTML = '';

      if (error) {
        payersList.innerHTML = '<li class="text-center text-red-400 py-4 italic">No se pudo cargar la lista de pagos.</li>';
        return;
      }

      if (!data || data.length === 0) {
        payersList.innerHTML = '<li class="text-center text-slate-500 py-4 italic" id="empty-state">Nadie ha registrado su pago todavía.</li>';
        return;
      }

      data.forEach((payment) => {
        const li = document.createElement('li');
        li.className = 'flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-sm';

        const date = new Date(payment.created_at).toLocaleDateString();
        const examTitle = payment.exams ? payment.exams.title : 'Examen';

        const isApproved = payment.status === 'approved';
        const statusColor = isApproved ? 'emerald' : 'amber';
        const statusIcon = isApproved ? 'check' : 'clock';
        const statusText = isApproved ? 'Confirmado' : 'Pendiente';

        li.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-${statusColor}-900/40 flex items-center justify-center text-${statusColor}-400 border border-${statusColor}-800/50">
              <i data-lucide="${statusIcon}" class="w-5 h-5"></i>
            </div>
            <div>
              <p class="font-semibold text-slate-100">${payment.names}</p>
              <p class="text-xs text-slate-400">Ref: ****${String(payment.reference).slice(-4)} • ${examTitle}</p>
              <p class="text-xs text-${statusColor}-400 font-medium md:hidden">${statusText}</p>
            </div>
          </div>
          <div class="w-full sm:w-auto text-left sm:text-right">
            <div class="text-xs text-slate-500 mb-1">${date}</div>
            <span class="hidden md:inline-block px-2 py-0.5 rounded text-xs font-medium bg-${statusColor}-900/30 text-${statusColor}-400 border border-${statusColor}-700/50">
              ${statusText}
            </span>
          </div>
        `;

        payersList.appendChild(li);
      });

      createIcons({ icons });
    }

    function showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      const bgClass = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-slate-800';
      const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';

      toast.className = `${bgClass} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm`;
      toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5"></i><p class="text-sm font-medium">${message}</p>`;

      container.appendChild(toast);
      createIcons({ icons });

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          if (container.contains(toast)) {
            container.removeChild(toast);
          }
        }, 300);
      }, 3000);
    }

    function copyToClipboard(text, fieldName) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(`${fieldName} copiado`, 'info'))
        .catch(() => showToast('Error al copiar', 'error'));
    }

    function copyPaymentData() {
      const bankRaw = document.getElementById('bank-data').textContent || '';
      const phoneRaw = document.getElementById('phone-data').textContent || '';
      const idCardRaw = document.getElementById('id-data').textContent || '';

      if (!window.selectedExamState) {
        showToast('Selecciona un examen para incluir el monto', 'error');
        return;
      }

      const bankCode = bankRaw.replace(/\D/g, '').slice(0, 4);
      const phone = phoneRaw.replace(/\D/g, '');
      const idCard = idCardRaw.replace(/\D/g, '');
      const amount = Number(window.selectedExamState.price || 0).toFixed(2);

      const quickText = [
        `Banco: ${bankCode}`,
        `Teléfono: ${phone}`,
        `Cédula: ${idCard}`,
        `Monto: Bs ${amount}`,
      ].join('\n');

      navigator.clipboard
        .writeText(quickText)
        .then(() => showToast('Datos copiados en formato compatible con BDV', 'success'))
        .catch(() => showToast('Error al copiar los datos', 'error'));
    }

    window.publicShowToast = showToast;
    window.reloadPublicPayments = loadPayments;
    window.copyToClipboard = copyToClipboard;
    window.copyPaymentData = copyPaymentData;

    loadExams();
    loadPayments();
  }, []);

  return <div data-island="public-page" className="hidden" aria-hidden="true" />;
}
