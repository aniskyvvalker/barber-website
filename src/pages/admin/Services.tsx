import { useEffect, useState } from 'react'
import type React from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { toast } from '../../hooks/use-toast'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Settings, Plus, Edit, Trash2, DollarSign, Clock, Scissors } from 'lucide-react'

interface Service {
  id: string
  name: string
  price: number
  duration: number
  description: string | null
  is_active: boolean
  display_order: number
  created_at: string
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    description: '',
  })

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('display_order')

    if (error) {
      console.error('Error fetching services:', error)
    } else {
      setServices(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.price || !formData.duration) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' })
      return
    }

    const price = parseFloat(formData.price)
    const duration = parseInt(formData.duration)

    if (isNaN(price) || price <= 0) {
      toast({ title: 'Invalid price', description: 'Please enter a valid price', variant: 'destructive' })
      return
    }

    if (isNaN(duration) || duration <= 0) {
      toast({ title: 'Invalid duration', description: 'Please enter a valid duration', variant: 'destructive' })
      return
    }

    setSubmitting(true)

    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update({
            name: formData.name,
            price: price,
            duration: duration,
            description: formData.description || null,
          })
          .eq('id', editingService.id)

        if (error) throw error
      } else {
        const maxOrder = services.length > 0 
          ? Math.max(...services.map(s => s.display_order))
          : 0

        const { error } = await supabase
          .from('services')
          .insert({
            name: formData.name,
            price: price,
            duration: duration,
            description: formData.description || null,
            is_active: true,
            display_order: maxOrder + 1,
          })

        if (error) throw error
      }

      setFormData({ name: '', price: '', duration: '', description: '' })
      setEditingService(null)
      setDialogOpen(false)
      fetchServices()
    } catch (error) {
      console.error('Error saving service:', error)
      toast({ title: 'Error', description: 'Failed to save service', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration.toString(),
      description: service.description || '',
    })
    setDialogOpen(true)
  }

  const handleToggleActive = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id)

    if (error) {
      console.error('Error toggling service status:', error)
      toast({ title: 'Error', description: 'Failed to update service status', variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Service status updated' })
      fetchServices()
    }
  }

  const handleDelete = async (service: Service) => {
    if (!confirm(`Are you sure you want to delete "${service.name}"? This may affect existing and future appointments.`)) {
      return
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', service.id)

    if (error) {
      console.error('Error deleting service:', error)
      toast({ title: 'Error', description: 'Failed to delete service', variant: 'destructive' })
    } else {
      toast({ title: 'Deleted', description: 'Service deleted successfully' })
      fetchServices()
    }
  }

  const activeServices = services.filter(s => s.is_active)
  const inactiveServices = services.filter(s => !s.is_active)

  const avgDuration = services.length > 0
    ? Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length)
    : 0

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Services Management</h2>
          <p className="text-gray-600 mt-1">Manage your service offerings and pricing</p>
        </div>
        
        <Button
          className="gap-2"
          onClick={() => {
            setEditingService(null)
            setFormData({ name: '', price: '', duration: '', description: '' })
            setDialogOpen(true)
          }}
        >
          <Plus size={20} />
          Add Service
        </Button>
        {dialogOpen && (
          <div
            className="fixed inset-0"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2147483600 }}
            onClick={() => {
              setDialogOpen(false)
              setEditingService(null)
              setFormData({ name: '', price: '', duration: '', description: '' })
            }}
          >
            <div
              className="fixed"
              style={{
                position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2147483601,
                width: 'min(100%, 640px)', background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e5e7eb'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                <h3 className="text-lg font-semibold leading-none tracking-tight">{editingService ? 'Edit Service' : 'Add New Service'}</h3>
                <p className="text-sm text-gray-500">{editingService ? 'Update service details' : 'Create a new service offering'}</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Service Name *</Label>
                  <Input
                    placeholder="Classic Haircut"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price ($) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="45.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (min) *</Label>
                    <Input
                      type="number"
                      step="5"
                      min="5"
                      placeholder="45"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Brief description of the service..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false)
                      setEditingService(null)
                      setFormData({ name: '', price: '', duration: '', description: '' })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : editingService ? 'Update' : 'Add Service'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{services.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeServices.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{avgDuration} min</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Price Range</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">
              ${services.length ? Math.min(...services.map(s => s.price)) : 0}-${services.length ? Math.max(...services.map(s => s.price)) : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Services */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Active Services</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : activeServices.length === 0 ? (
            <div className="text-center py-12">
              <Scissors className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No active services</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeServices.map((service) => (
                <div key={service.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{service.name}</h3>
                      {service.description && (
                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                      )}
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 text-[#D4AF37]">
                      <DollarSign size={18} />
                      <span className="font-bold text-xl">${service.price}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock size={18} />
                      <span className="text-sm">{service.duration} minutes</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit size={16} className="mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(service)}
                    >
                      Deactivate
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(service)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Services */}
      {inactiveServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inactive Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-700">{service.name}</h3>
                      <span className="text-[#D4AF37] font-bold">${service.price}</span>
                      <span className="text-gray-500 text-sm">{service.duration} min</span>
                    </div>
                    {service.description && (
                      <p className="text-sm text-gray-600">{service.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(service)}
                    >
                      Activate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(service)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
