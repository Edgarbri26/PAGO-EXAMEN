import { useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function PublicFormIsland() {
  useEffect(() => {
    const formSection = document.getElementById('form-section');
    const actionBtnContainer = document.getElementById('action-button-container');
    const paymentForm = document.getElementById('payment-form');
    const validationModal = document.getElementById('validation-modal');

    function showToast(message, type = 'info') {
      if (window.publicShowToast) {
        window.publicShowToast(message, type);
      }
    }

    function toggleForm() {
      if (formSection.classList.contains('hidden')) {
        formSection.classList.remove('hidden');
        actionBtnContainer.classList.add('hidden');
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        formSection.classList.add('hidden');
        actionBtnContainer.classList.remove('hidden');
        paymentForm.reset();
      }
    }

    function updateFileName(input) {
      const fileNameDisplay = document.getElementById('file-name');
      if (input.files && input.files.length > 0) {
        fileNameDisplay.innerText = input.files[0].name;
        fileNameDisplay.classList.add('text-indigo-400', 'font-medium');
      } else {
        fileNameDisplay.innerText = 'PNG, JPG hasta 5MB';
        fileNameDisplay.classList.remove('text-indigo-400', 'font-medium');
      }
    }

    async function showValidationModalFor2s() {
      validationModal.classList.remove('hidden');
      validationModal.classList.add('flex');

      await new Promise((resolve) => setTimeout(resolve, 2000));

      validationModal.classList.remove('flex');
      validationModal.classList.add('hidden');
    }

    async function submitPayment(event) {
      event.preventDefault();

      if (!window.selectedExamState) {
        showToast('Por favor selecciona un examen primero', 'error');
        return;
      }

      const names = document.getElementById('names').value;
      const reference = document.getElementById('reference').value;
      const note = document.getElementById('note').value;
      const submitBtn = event.target.querySelector('button[type="submit"]');

      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Enviando...';

      await showValidationModalFor2s();

      const { error } = await supabase
        .from('payments')
        .insert([
          {
            names,
            reference,
            note,
            exam_id: window.selectedExamState.id,
            amount: window.selectedExamState.price,
            status: 'pending',
          },
        ]);

      if (error) {
        showToast(`Error al enviar: ${error.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
      }

      showToast('¡Pago registrado! Espera la aprobación del admin.', 'success');
      paymentForm.reset();
      toggleForm();
      if (window.reloadPublicPayments) {
        window.reloadPublicPayments();
      }

      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }

    window.toggleForm = toggleForm;
    window.submitPayment = submitPayment;
    window.updateFileName = updateFileName;
  }, []);

  return <div data-island="public-form" className="hidden" aria-hidden="true" />;
}
