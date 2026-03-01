import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle,
  Clock3,
  Copy,
  CopyCheck,
  Image as ImageIcon,
  Info,
  Save,
  Send,
  Smartphone,
  Users,
} from 'lucide-react';

const BANK_LABEL = '0102 - Banco de Venezuela';
const BANK_CODE = '0102';
const PHONE_LABEL = '0426-2498651';
const PHONE_VALUE = '04262498651';
const ID_LABEL = 'V-31.366.298';
const ID_VALUE = '3166298';

export default function PublicPageApp() {
  const [exams, setExams] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [form, setForm] = useState({ names: '', reference: '', note: '', paymentTypeId: '' });
  const [fileName, setFileName] = useState('PNG, JPG hasta 5MB');
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const selectedPaymentType = paymentTypes.find((type) => type.id === form.paymentTypeId) || null;
  const isCashPayment = selectedPaymentType?.code === 'efectivo';
  const requiresReference = selectedPaymentType?.requires_reference ?? true;

  const getDefaultPaymentTypeId = (types) => {
    const mobileType = types.find((type) => type.code === 'pago_movil');
    return mobileType?.id || types[0]?.id || '';
  };

  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(`${fieldName} copiado`, 'info');
    } catch {
      addToast('Error al copiar', 'error');
    }
  };

  const copyPaymentData = async () => {
    if (!selectedExam) {
      addToast('Selecciona un examen para incluir el monto', 'error');
      return;
    }

    const quickText = [
      `Banco: ${BANK_CODE}`,
      `Teléfono: ${PHONE_VALUE}`,
      `Cédula: ${ID_VALUE}`,
      `Monto: Bs ${Number(selectedExam.price || 0).toFixed(2)}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(quickText);
      addToast('Datos copiados en formato compatible con BDV', 'success');
    } catch {
      addToast('Error al copiar los datos', 'error');
    }
  };

  const loadExams = async () => {
    setLoadingExams(true);
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      addToast('Error al cargar exámenes', 'error');
      setExams([]);
      setLoadingExams(false);
      return;
    }

    const activeExams = data || [];
    setExams(activeExams);

    if (activeExams.length === 1) {
      setSelectedExam(activeExams[0]);
    }

    setLoadingExams(false);
  };

  const loadPayments = async () => {
    setLoadingPayments(true);
    const { data, error } = await supabase
      .from('payments')
      .select('names, reference, created_at, status, exams!inner(title, active), payment_types(name, code)')
      .in('status', ['approved', 'pending'])
      .eq('exams.active', true)
      .order('created_at', { ascending: false });

    if (error) {
      addToast('No se pudo cargar la lista de pagos', 'error');
      setPayments([]);
      setLoadingPayments(false);
      return;
    }

    setPayments(data || []);
    setLoadingPayments(false);
  };

  const loadPaymentTypes = async () => {
    const { data, error } = await supabase
      .from('payment_types')
      .select('id, code, name, requires_reference')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      addToast('No se pudieron cargar los tipos de pago', 'error');
      setPaymentTypes([]);
      return;
    }

    const types = data || [];
    setPaymentTypes(types);

    setForm((prev) => {
      const alreadyExists = types.some((type) => type.id === prev.paymentTypeId);
      return {
        ...prev,
        paymentTypeId: alreadyExists ? prev.paymentTypeId : getDefaultPaymentTypeId(types),
      };
    });
  };

  useEffect(() => {
    loadExams();
    loadPayments();
    loadPaymentTypes();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedExam) {
      addToast('Por favor selecciona un examen primero', 'error');
      return;
    }

    if (!form.paymentTypeId) {
      addToast('Selecciona un tipo de pago', 'error');
      return;
    }

    if (requiresReference && !form.reference.trim()) {
      addToast('La referencia es obligatoria para Pago Móvil', 'error');
      return;
    }

    setIsSubmitting(true);
    setShowValidationModal(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setShowValidationModal(false);

    const { error } = await supabase.from('payments').insert([
      {
        names: form.names,
        reference: requiresReference ? form.reference.trim() : null,
        note: form.note,
        exam_id: selectedExam.id,
        amount: selectedExam.price,
        status: 'pending',
        payment_type_id: form.paymentTypeId,
      },
    ]);

    if (error) {
      addToast(`Error al enviar: ${error.message}`, 'error');
      setIsSubmitting(false);
      return;
    }

    addToast('¡Pago registrado! Espera la aprobación del admin.', 'success');
    setForm((prev) => ({
      names: '',
      reference: '',
      note: '',
      paymentTypeId: prev.paymentTypeId,
    }));
    setFileName('PNG, JPG hasta 5MB');
    setShowForm(false);
    setIsSubmitting(false);
    loadPayments();
  };

  return (
    <>
      <div className="max-w-3xl mx-auto px-3 py-4 sm:px-4 md:p-8">
        <header className="text-center mb-8 md:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-400 mb-2">Registro de Pago</h1>
          <p className="text-sm sm:text-base text-slate-400">Selecciona tu examen y registra tu pago</p>
        </header>

        <section className="bg-indigo-900/40 rounded-2xl border border-indigo-500/30 p-4 sm:p-5 md:p-6 mb-6 md:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-indigo-100 mb-4 flex items-center gap-2">
            <BookOpen className="text-indigo-400 w-5 h-5" /> 1. Selecciona el Examen
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {loadingExams && (
              <>
                <ExamSkeleton />
                <ExamSkeleton />
              </>
            )}
            {!loadingExams && exams.length === 0 && (
              <p className="text-slate-400">No hay exámenes activos en este momento.</p>
            )}
            {exams.map((exam) => {
              const isSelected = selectedExam?.id === exam.id;
              return (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => setSelectedExam(exam)}
                  className={`text-left cursor-pointer border p-4 rounded-lg transition-all exam-card ${
                    isSelected
                      ? 'ring-2 ring-indigo-500 bg-indigo-900/20 border-indigo-500'
                      : 'border-slate-600 bg-slate-800 hover:border-indigo-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <h3 className="font-bold text-base sm:text-lg text-white break-words">{exam.title}</h3>
                    <span className="text-emerald-400 font-bold text-lg sm:text-xl">Bs {exam.price}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">{exam.description || ''}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 p-4 sm:p-5 md:p-6 mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-indigo-500 w-5 h-5" />
            <h2 className="text-lg sm:text-xl font-semibold text-slate-100">Integrantes que ya pagaron</h2>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 sm:p-4 max-h-72 overflow-y-auto">
            <ul className="space-y-3">
              {loadingPayments && (
                <>
                  <PaymentSkeleton />
                  <PaymentSkeleton />
                </>
              )}
              {!loadingPayments && payments.length === 0 && (
                <li className="text-center text-slate-500 py-4 italic">Nadie ha registrado su pago todavía.</li>
              )}
              {payments.map((payment, idx) => {
                const isApproved = payment.status === 'approved';
                const statusText = isApproved ? 'Confirmado' : 'Pendiente';
                const date = new Date(payment.created_at).toLocaleDateString();
                const hasReference = Boolean(payment.reference);
                const paymentTypeName = payment.payment_types?.name || 'Pago';
                return (
                  <li
                    key={`${payment.reference}-${idx}`}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                          isApproved
                            ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50'
                            : 'bg-amber-900/40 text-amber-400 border-amber-800/50'
                        }`}
                      >
                        {isApproved ? <Check className="w-5 h-5" /> : <Clock3 className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100">{payment.names}</p>
                        <p className="text-xs text-slate-400">
                          {hasReference ? `Ref: ****${String(payment.reference).slice(-4)}` : 'Sin referencia'} • {paymentTypeName} • {payment.exams?.title || 'Examen'}
                        </p>
                        <p className={`text-xs font-medium md:hidden ${isApproved ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {statusText}
                        </p>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto text-left sm:text-right">
                      <div className="text-xs text-slate-500 mb-1">{date}</div>
                      <span
                        className={`hidden md:inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                          isApproved
                            ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50'
                            : 'bg-amber-900/30 text-amber-400 border-amber-700/50'
                        }`}
                      >
                        {statusText}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="bg-indigo-600 rounded-2xl shadow-md text-white p-4 sm:p-5 md:p-6 mb-6 md:mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-white opacity-10 rounded-full"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-5 sm:mb-6">
              <Smartphone className="text-indigo-200 w-5 h-5" />
              <h2 className="text-lg sm:text-xl font-semibold">Datos de Pago Móvil</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataBox label="Banco" value={BANK_LABEL} onCopy={() => copyToClipboard(BANK_CODE, 'Banco')} />
              <DataBox label="Teléfono" value={PHONE_LABEL} onCopy={() => copyToClipboard(PHONE_VALUE, 'Teléfono')} />
              <DataBox label="Cédula" value={ID_LABEL} onCopy={() => copyToClipboard(ID_VALUE, 'Cédula')} />

              <div className="bg-indigo-700/50 rounded-lg p-3 flex justify-between items-center backdrop-blur-sm">
                <div>
                  <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Monto a Pagar</p>
                  <p className="font-medium text-xl text-emerald-300">
                    {selectedExam ? `Bs ${selectedExam.price}` : 'Selecciona un examen'}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={copyPaymentData}
              className="mt-4 w-full bg-indigo-700 hover:bg-indigo-800 border border-indigo-400/30 rounded-lg py-3 px-4 flex items-center justify-center gap-2 transition-colors text-sm sm:text-base text-center"
            >
              <CopyCheck className="w-5 h-5 text-indigo-200" />
              <span className="font-semibold">Copiar todos los datos para pago rápido</span>
            </button>
          </div>
        </section>

        {!showForm ? (
          <div className="text-center mb-6 md:mb-8">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              disabled={!selectedExam}
              className={`w-full sm:w-auto text-white font-bold text-base sm:text-lg py-3 sm:py-4 px-6 sm:px-10 rounded-full shadow-lg transform transition flex items-center justify-center gap-2 mx-auto ${
                selectedExam
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 hover:-translate-y-1'
                  : 'bg-slate-600 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-6 h-6" />
              {selectedExam ? `¡Ya pagué el de ${selectedExam.title}!` : 'Selecciona un examen primero'}
            </button>
          </div>
        ) : (
          <section className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 p-4 sm:p-5 md:p-6 fade-in mb-8">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
              <Send className="text-indigo-400 w-5 h-5" />
              <h2 className="text-xl font-semibold text-slate-100">Reportar Pago</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Pago</label>
                <select
                  required
                  value={form.paymentTypeId}
                  onChange={(e) => setForm((prev) => ({ ...prev, paymentTypeId: e.target.value, reference: '' }))}
                  className="w-full px-4 py-3 bg-slate-900 rounded-lg border border-slate-600 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                >
                  {paymentTypes.length === 0 && <option value="">No hay tipos de pago</option>}
                  {paymentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nombres de los integrantes (separados por coma)
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.names}
                  onChange={(e) => setForm((prev) => ({ ...prev, names: e.target.value }))}
                  placeholder="Ej: Juan Pérez, María Gómez..."
                  className="w-full px-4 py-3 bg-slate-900 rounded-lg border border-slate-600 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none"
                />
              </div>

              {requiresReference && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Número de Referencia (Últimos 6 dígitos)
                  </label>
                  <input
                    type="text"
                    required
                    value={form.reference}
                    onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
                    placeholder="Ej: 123456"
                    pattern="[0-9]{4,10}"
                    className="w-full px-4 py-3 bg-slate-900 rounded-lg border border-slate-600 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nota / Observación (Opcional)</label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Algún comentario adicional..."
                  className="w-full px-4 py-3 bg-slate-900 rounded-lg border border-slate-600 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none"
                />
              </div>

              {!isCashPayment && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Capture o Comprobante (Opcional)</label>
                  <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-lg hover:border-indigo-400 transition-colors bg-slate-900 cursor-pointer">
                    <div className="space-y-1 text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-slate-500" />
                      <div className="flex text-sm text-slate-400 justify-center">
                        <span className="relative rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none">
                          Sube un archivo
                        </span>
                      </div>
                      <input
                        name="file-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setFileName(file ? file.name : 'PNG, JPG hasta 5MB');
                        }}
                      />
                      <p className={`text-xs ${fileName === 'PNG, JPG hasta 5MB' ? 'text-slate-500' : 'text-indigo-400 font-medium'}`}>
                        {fileName}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 px-4 border border-slate-600 text-slate-300 font-medium rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-medium py-3 px-4 rounded-lg shadow-md transition-colors flex justify-center items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>

      <div className="fixed inset-x-3 bottom-4 md:inset-auto md:bottom-5 md:right-5 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>

      {showValidationModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full border-4 border-indigo-300 border-t-indigo-600 animate-spin"></div>
            <h3 className="text-lg font-semibold text-slate-100">Validando pago...</h3>
            <p className="text-sm text-slate-400 mt-1">Espera un momento, estamos procesando tu reporte.</p>
          </div>
        </div>
      )}
    </>
  );
}

function ExamSkeleton() {
  return (
    <div className="border border-slate-700 bg-slate-800/80 p-4 rounded-lg animate-pulse">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="h-5 w-2/3 rounded bg-slate-700"></div>
        <div className="h-5 w-20 rounded bg-slate-700"></div>
      </div>
      <div className="h-4 w-11/12 rounded bg-slate-700 mt-3"></div>
    </div>
  );
}

function PaymentSkeleton() {
  return (
    <li className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-sm animate-pulse">
      <div className="flex items-center gap-3 w-full">
        <div className="w-10 h-10 rounded-full bg-slate-700"></div>
        <div className="flex-1">
          <div className="h-4 w-40 rounded bg-slate-700 mb-2"></div>
          <div className="h-3 w-52 rounded bg-slate-700"></div>
        </div>
      </div>
      <div className="h-3 w-20 rounded bg-slate-700"></div>
    </li>
  );
}

function DataBox({ label, value, onCopy }) {
  return (
    <div className="bg-indigo-700/50 rounded-lg p-3 flex justify-between items-center backdrop-blur-sm">
      <div>
        <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
      <button type="button" onClick={onCopy} className="p-2 hover:bg-indigo-600 rounded-lg transition-colors" title={`Copiar ${label}`}>
        <Copy className="w-5 h-5 text-indigo-200 hover:text-white" />
      </button>
    </div>
  );
}

function Toast({ message, type }) {
  const styles =
    type === 'success'
      ? 'bg-emerald-600'
      : type === 'error'
        ? 'bg-red-600'
        : 'bg-slate-800';

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Info;

  return (
    <div className={`${styles} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm`}>
      <Icon className="w-5 h-5" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
