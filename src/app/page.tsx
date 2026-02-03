'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Check, Search, Briefcase, MapPin, Globe, User, ChevronDown, ChevronUp, Loader2, RefreshCw, Smartphone, Mail, Linkedin, ExternalLink, Database } from 'lucide-react'

// --- Types ---
type Contact = {
  id: string
  name: string
  title: string
  email: string
  phone: string | null
  linkedin: string | null
  seniority: string | null
}

type Company = {
  key: string
  name: string
  description: string
  website: string | null
  location: string | null

  // App specific status
  contacted: boolean
  contacted_by: string | null
  contacted_at: string | null

  // Dynamic Owner (assigned on frontend fetch)
  owner?: 'VANESSA' | 'DEBORA'

  contacts: Contact[]
}

// --- Helpers ---
const seniorityOrder = ['c_suite', 'founder', 'head', 'director', 'senior', 'manager', 'partner', 'entry']

function getSeniorityBadge(level: string | null) {
  if (!level) return { label: '?', style: 'text-slate-500 bg-slate-100 border-slate-200' }

  // Custom logic to match the "yellow" HEAD badge style from screenshot if needed, but keeping consistent palette for now
  // User example: HEAD (Yellow bg, dark yellow text)
  const clean = level.toLowerCase()

  // Default Map
  let style = 'text-slate-600 bg-slate-100 border-slate-200'
  let label = level.toUpperCase()

  switch (clean) {
    case 'c_suite':
      label = 'C-LEVEL'
      style = 'text-red-700 bg-red-100 border-red-200'
      break
    case 'founder':
      label = 'FOUNDER'
      style = 'text-orange-700 bg-orange-100 border-orange-200'
      break
    case 'head':
      label = 'HEAD'
      style = 'text-yellow-700 bg-yellow-100 border-yellow-200'
      break
    case 'director':
      label = 'DIRECTOR'
      style = 'text-green-700 bg-green-100 border-green-200'
      break
    case 'senior':
      style = 'text-blue-700 bg-blue-100 border-blue-200'
      break
    case 'manager':
      style = 'text-purple-700 bg-purple-100 border-purple-200'
      break
  }

  return { label, style }
}

function cleanPhone(phone: string | null) {
  return (phone || '').replace(/\D/g, '')
}

// --- Component ---

export default function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [search, setSearch] = useState('')
  const [activeOwner, setActiveOwner] = useState<'VANESSA' | 'DEBORA'>('VANESSA')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'contacted'>('all')
  const [seniorityFilter, setSeniorityFilter] = useState<string>('all')

  useEffect(() => {
    const saved = localStorage.getItem('outreach_username')
    if (saved) setUserName(saved)
    fetchCompanies()
  }, [])

  const saveUserName = (name: string) => {
    setUserName(name)
    localStorage.setItem('outreach_username', name)
  }

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/companies')
      if (!res.ok) throw new Error('Falha ao api')
      const data: Company[] = await res.json()

      // Assign Owners Split Logic
      const splitIndex = Math.ceil(data.length / 2)
      const enriched = data.map((c, idx) => {
        // Sort Contacts by Seniority
        const sortedContacts = [...c.contacts].sort((a, b) => {
          const idxA = seniorityOrder.indexOf(a.seniority?.toLowerCase() || '')
          const idxB = seniorityOrder.indexOf(b.seniority?.toLowerCase() || '')
          const valA = idxA === -1 ? 99 : idxA
          const valB = idxB === -1 ? 99 : idxB
          return valA - valB
        })

        return {
          ...c,
          contacts: sortedContacts,
          owner: (idx < splitIndex ? 'VANESSA' : 'DEBORA') as 'VANESSA' | 'DEBORA'
        }
      })

      setCompanies(enriched)
    } catch (err) {
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (company: Company) => {
    // If we removed the input, we can just use the active owner or a default "User"
    // Since the tab is owner-specific, it makes sense to tag them as the contactor
    const userToLog = activeOwner


    const newStatus = !company.contacted
    // Optimistic Update
    setCompanies(prev => prev.map(c => c.key === company.key ? { ...c, contacted: newStatus } : c))

    try {
      await fetch('/api/company-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_key: company.key,
          contacted: newStatus,
          contacted_by: userToLog
        })
      })
      toast.success(newStatus ? 'Marcada!' : 'Desmarcada.')
    } catch (err) {
      toast.error('Erro ao atualizar.')
      fetchCompanies() // Revert on error
    }
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  const filtered = useMemo(() => {
    return companies.filter(c => {
      const matchesOwner = c.owner === activeOwner
      const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all'
        ? true
        : statusFilter === 'contacted' ? c.contacted : !c.contacted

      const matchesSeniority = seniorityFilter === 'all'
        ? true
        : c.contacts.some(contact => (contact.seniority || '').toLowerCase().includes(seniorityFilter.toLowerCase()))

      return matchesOwner && matchesSearch && matchesStatus && matchesSeniority
    })
  }, [companies, activeOwner, search, statusFilter, seniorityFilter])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-col relative pl-16">
            <img src="/logo_icon.png" alt="Mar de Leads Logo" className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 object-contain" />
            <h1 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">DASHBOARD COMERCIAL</h1>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
              MAR DE LEADS <span className="text-slate-300 font-light ml-1">China</span>
            </h2>
          </div>

          <div className="flex flex-1 w-full sm:w-auto gap-2 max-w-lg justify-end items-center">
            {/* Filters */}
            <select
              className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-md px-3 py-2 outline-none focus:border-indigo-500"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="contacted">Contatados</option>
            </select>

            <select
              className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-md px-3 py-2 outline-none focus:border-indigo-500"
              value={seniorityFilter}
              onChange={e => setSeniorityFilter(e.target.value)}
            >
              <option value="all">Todas Senioridades</option>
              <option value="c_suite">C-Level</option>
              <option value="director">Diretores</option>
              <option value="manager">Gerentes</option>
              <option value="head">Heads</option>
            </select>

            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-md text-sm outline-none focus:ring-2 ring-indigo-500/20 transition-all"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <button onClick={fetchCompanies} className="p-2 hover:bg-slate-100 rounded-md text-slate-500" title="Atualizar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-8 gap-6">
          <button
            onClick={() => setActiveOwner('VANESSA')}
            className={`pb-3 px-2 text-sm font-bold tracking-wide transition-all border-b-2 ${activeOwner === 'VANESSA' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            VANESSA
          </button>
          <button
            onClick={() => setActiveOwner('DEBORA')}
            className={`pb-3 px-2 text-sm font-bold tracking-wide transition-all border-b-2 ${activeOwner === 'DEBORA' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            DEBORA
          </button>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Lista de Prospecção</h2>
          <span className="text-xs bg-slate-200 px-2 py-1 rounded-full font-mono text-slate-600">{filtered.length} Empresas</span>
        </div>

        {loading && filtered.length === 0 ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {filtered.map(company => (
              <CompanyCard
                key={company.key}
                company={company}
                onToggle={toggleStatus}
                onCopy={handleCopy}
              />
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 rounded-lg">Nenhuma empresa encontrada para este filtro.</div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

function CompanyCard({ company, onToggle, onCopy }: { company: Company, onToggle: (c: Company) => void, onCopy: (text: string, label: string) => void }) {
  const [open, setOpen] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const handleSendHubSpot = async (contact: any) => {
    // Prevent double clicks
    if (sendingId) return

    setSendingId(contact.id)
    const toastId = toast.loading('Enviando para HubSpot...')

    try {
      const res = await fetch('/api/hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.name,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          linkedin: contact.linkedin,
          owner: company.owner
        })
      })

      if (!res.ok) throw new Error('Falha no envio')

      toast.success('Enviado com sucesso!', { id: toastId })
    } catch (err) {
      toast.error('Erro ao enviar.', { id: toastId })
    } finally {
      setSendingId(null)
    }
  }




  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md flex flex-col md:flex-row ${company.contacted ? 'border-green-200 bg-green-50/10' : 'border-slate-200'}`}>

      {/* Left Column: Company Info */}
      <div className="md:w-[30%] bg-slate-50/50 p-6 flex flex-col border-b md:border-b-0 md:border-r border-slate-100">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="text-xl font-bold text-slate-800 leading-snug truncate" title={company.name}>{company.name}</h3>

          {/* Status Button (Moved to top right of logic area for App functionality) */}
          <button
            onClick={() => onToggle(company)}
            className={`shrink-0 p-1.5 rounded-full transition-colors ${company.contacted ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
            title={company.contacted ? 'Marcada como contatada' : 'Marcar como contatada'}
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-600 uppercase tracking-widest border border-slate-200 shadow-sm">
            {company.contacts.length} Leads
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 uppercase tracking-widest border border-blue-100">
            {company.owner}
          </span>
        </div>

        <div className="text-xs text-slate-500 leading-relaxed overflow-y-auto max-h-[100px] mb-4 pr-2 custom-scrollbar">
          {company.description || <span className="italic text-slate-400">Descrição indisponível.</span>}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-200/60 flex items-center justify-between">
          {company.website ? (
            <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 group">
              <Globe className="w-3 h-3 group-hover:scale-110 transition-transform" />
              Website
            </a>
          ) : <span className="text-xs text-slate-400">Sem site</span>}

          <div className="flex flex-col items-end">
            {company.contacted && <span className="text-[10px] text-green-600 font-medium">Contatado por {company.contacted_by}</span>}
          </div>
        </div>
      </div>

      {/* Right Column: Contacts */}
      <div className="md:w-[70%] p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contatos Qualificados</h4>
          <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-indigo-600 md:hidden">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {open && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
            {company.contacts.map(contact => {
              const seniorityInfo = getSeniorityBadge(contact.seniority)
              const waLink = contact.phone ? `https://wa.me/${cleanPhone(contact.phone)}` : '#'

              return (
                <div key={contact.id} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all group relative bg-white flex flex-col gap-3">
                  {/* Top Row: Name & Badge */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-base text-slate-800 leading-tight" title={contact.name}>{contact.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5" title={contact.title}>{contact.title}</div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${seniorityInfo.style}`}>
                      {seniorityInfo.label}
                    </span>
                  </div>

                  {/* Actions Rows */}
                  <div className="space-y-2 mt-2">
                    {/* Email Row */}
                    {contact.email && (
                      <div className="flex items-center justify-between group/row">
                        <div className="flex items-center gap-2 overflow-hidden text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs truncate">{contact.email}</span>
                        </div>
                        <button
                          onClick={() => onCopy(contact.email, 'Email')}
                          className="ml-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold px-2 py-1 rounded-md transition-all whitespace-nowrap"
                          title="Copiar Email"
                        >
                          copiar email
                        </button>
                      </div>
                    )}

                    {/* Phone Row */}
                    {contact.phone && (
                      <div className="flex items-center justify-between group/row">
                        <div className="flex items-center gap-2 overflow-hidden text-slate-600">
                          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                          <a href={waLink} target="_blank" className="text-xs truncate hover:underline hover:text-green-600 transition-colors" title="Abrir WhatsApp">{contact.phone}</a>
                        </div>
                        <button
                          onClick={() => onCopy(contact.phone || '', 'Número')}
                          className="ml-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold px-2 py-1 rounded-md transition-all whitespace-nowrap"
                          title="Copiar Número"
                        >
                          copiar numero
                        </button>
                      </div>
                    )}

                    {/* LinkedIn Row */}
                    {contact.linkedin && (
                      <div className="flex items-center justify-between group/row">
                        <div className="flex items-center gap-2 overflow-hidden text-slate-600">
                          <Linkedin className="w-3.5 h-3.5 text-slate-400" />
                          <a href={contact.linkedin} target="_blank" className="text-xs truncate hover:underline underline-offset-2">LinkedIn</a>
                        </div>
                        <a
                          href={contact.linkedin}
                          target="_blank"
                          className="ml-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold px-2 py-1 rounded-md transition-all whitespace-nowrap"
                        >
                          abrir link
                        </a>
                      </div>
                    )}

                    {/* HubSpot Button */}
                    <button
                      onClick={() => handleSendHubSpot(contact)}
                      disabled={sendingId === contact.id}
                      className={`w-full mt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider py-2 rounded-md transition-all border ${sendingId === contact.id ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100 hover:border-orange-200'}`}
                    >
                      {sendingId === contact.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Database className="w-3 h-3" />
                      )}
                      {sendingId === contact.id ? 'Enviando...' : 'Enviar para HubSpot'}
                    </button>

                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
