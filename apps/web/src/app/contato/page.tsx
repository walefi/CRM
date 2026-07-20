'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const INBOUND_API_KEY = process.env.NEXT_PUBLIC_LEAD_INBOUND_API_KEY || '';

export default function ContatoPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    website: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const apiKeyConfigured = INBOUND_API_KEY.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.website) {
      setStatus('success');
      return;
    }

    if (!apiKeyConfigured) {
      setStatus('error');
      setErrorMessage('Configuração incompleta. Entre em contato com o suporte.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_URL}/api/v1/leads/inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': INBOUND_API_KEY,
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          company: form.company || undefined,
          message: form.message || undefined,
          source: 'WEBSITE',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setForm({ name: '', email: '', phone: '', company: '', message: '', website: '' });
        return;
      }

      setStatus('error');

      switch (response.status) {
        case 400:
          setErrorMessage(data?.message || 'Dados inválidos. Verifique os campos e tente novamente.');
          break;
        case 401:
        case 403:
          setErrorMessage('Não foi possível processar sua mensagem. Tente novamente mais tarde.');
          break;
        case 429:
          setErrorMessage('Muitas tentativas. Aguarde um momento e tente novamente.');
          break;
        case 500:
          setErrorMessage('Erro interno do servidor. Tente novamente mais tarde.');
          break;
        default:
          setErrorMessage('Erro ao enviar formulário. Tente novamente.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Erro de conexão. Verifique sua internet e tente novamente.');
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Mensagem Enviada!</h2>
          <p className="text-gray-600 mb-6">
            Obrigado pelo contato. Entraremos em contato em breve.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enviar outra mensagem
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fale Conosco</h1>
          <p className="text-gray-600">
            Preencha o formulário abaixo e entraremos em contato o mais breve possível.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo *
            </label>
            <input
              id="name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <input
              id="company"
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Nome da empresa"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem
            </label>
            <textarea
              id="message"
              rows={4}
              maxLength={5000}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
              placeholder="Como podemos ajudar?"
            />
          </div>

          <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || !form.name}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'loading' ? 'Enviando...' : 'Enviar Mensagem'}
          </button>
        </form>
      </div>
    </div>
  );
}
