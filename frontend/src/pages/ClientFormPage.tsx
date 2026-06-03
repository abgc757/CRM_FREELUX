import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createClient, getClient, updateClient } from '../services/clients'

export default function ClientFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '', rfc: '', email: '', phone: '', contact_name: '',
    address: '', city: '', state: '', zip_code: '', credit_limit: 0, notes: '',
  })

  useEffect(() => {
    if (isEditing) {
      getClient(Number(id)).then((client) => {
        setForm({
          nombre: client.nombre, rfc: client.rfc, email: client.email || '',
          phone: client.phone || '', contact_name: client.contact_name || '',
          address: client.address || '', city: client.city || '',
          state: client.state || '', zip_code: client.zip_code || '',
          credit_limit: client.credit_limit, notes: client.notes || '',
        })
      })
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEditing) {
        await updateClient(Number(id), form)
      } else {
        await createClient(form)
      }
      navigate('/clientes')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nombre *</label>
            <input name="nombre" className="input" value={form.nombre} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">RFC *</label>
            <input name="rfc" className="input" value={form.rfc} onChange={handleChange} required disabled={isEditing} />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" value={form.email} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input name="phone" className="input" value={form.phone} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Contacto</label>
            <input name="contact_name" className="input" value={form.contact_name} onChange={handleChange} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Dirección</label>
            <input name="address" className="input" value={form.address} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input name="city" className="input" value={form.city} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Estado</label>
            <input name="state" className="input" value={form.state} onChange={handleChange} />
          </div>
          <div>
            <label className="label">CP</label>
            <input name="zip_code" className="input" value={form.zip_code} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Límite de crédito</label>
            <input name="credit_limit" type="number" className="input" value={form.credit_limit} onChange={handleChange} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notas</label>
            <textarea name="notes" className="input" rows={3} value={form.notes} onChange={handleChange} />
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/clientes')} className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
          </button>
        </div>
      </form>
    </div>
  )
}
