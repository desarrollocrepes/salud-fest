import './AdminPanel.css';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Download, 
  Users, 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Trash2
} from 'lucide-react';

// Obtener inscripciones desde la API
const fetchInscripciones = async () => {
  try {
    const response = await fetch('https://macfer.crepesywaffles.com/api/sintonizarte-saludfest-inscripcions');
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: No fue posible cargar las inscripciones`);
    }

    const payload = await response.json();
    const inscripciones = Array.isArray(payload?.data) ? payload.data : [];
    
    // Transformar datos de API al formato esperado
    return inscripciones.map(item => {
      const attr = item?.attributes || item || {};
      
      // Extraer datos de la actividad y reserva
      const horaActividad = attr.hora || 'Sin hora';
      const fechaReserva = attr.fecha || 'Sin fecha';
      const ubicacion = attr.ubicacion || 'Sin ubicación';
      
      return {
        id: item.id || Date.now(),
        nombre: attr.nombre || 'Sin nombre',
        email: attr.correo || attr.email || 'Sin correo',
        telefono: attr.telefono ? String(attr.telefono) : 'Sin teléfono',
        documento: attr.documento || '',
        curso: attr.area || 'Sin actividad',
        sesion: '',
        status: 'confirmado',
        fecha: new Date(attr.createdAt || attr.publishedAt || new Date()),
        ubicacion: ubicacion,
        horaActividad: horaActividad,
        fechaReserva: fechaReserva
      };
    });
  } catch (error) {
    console.error('Error al obtener inscripciones:', error);
    return [];
  }
};

const AdminPanel = ({ onBack }) => {
  // Estado para inscripciones
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Cargar inscripciones desde la API
  useEffect(() => {
    const loadInscriptions = async () => {
      const data = await fetchInscripciones();
      setInscriptions(data);
      setLoading(false);
    };
    
    loadInscriptions();
  }, []);

  // Filtrar y buscar
  const filteredInscriptions = useMemo(() => {
    return inscriptions.filter(insc => {
      const matchesSearch = insc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           insc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           insc.telefono.includes(searchTerm);
      const matchesCourse = !filterCourse || insc.curso === filterCourse;
      const matchesStatus = !filterStatus || insc.status === filterStatus;
      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [inscriptions, searchTerm, filterCourse, filterStatus]);

  // Resetear paginación cuando filtros cambien
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCourse, filterStatus]);

  // Ordenar
  const sortedInscriptions = useMemo(() => {
    let sorted = [...filteredInscriptions];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredInscriptions, sortConfig]);

  // Calcular paginación
  const totalPages = Math.ceil(sortedInscriptions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedInscriptions = sortedInscriptions.slice(startIndex, endIndex);

  // Obtener cursos únicos
  const courses = useMemo(() => {
    return [...new Set(inscriptions.map(insc => insc.curso))];
  }, [inscriptions]);

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: inscriptions.length,
      confirmados: inscriptions.filter(i => i.status === 'confirmado').length,
      pendientes: inscriptions.filter(i => i.status === 'pendiente').length,
      cancelados: inscriptions.filter(i => i.status === 'cancelado').length
    };
  }, [inscriptions]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmado: { color: 'bg-green-100', textColor: 'text-green-800', icon: CheckCircle },
      pendiente: { color: 'bg-yellow-100', textColor: 'text-yellow-800', icon: Clock },
      cancelado: { color: 'bg-red-100', textColor: 'text-red-800', icon: X }
    };
    
    const config = statusConfig[status] || statusConfig.pendiente;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color} ${config.textColor}`}>
        <Icon size={14} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleDeleteReserva = async (id, nombre) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la reserva de ${nombre}? Esta acción no se puede deshacer.`
    );
    
    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `https://macfer.crepesywaffles.com/api/sintonizarte-saludfest-inscripcions/${id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: No fue posible eliminar la inscripción`);
      }

      // Actualizar la lista de inscripciones
      setInscriptions(prev => prev.filter(insc => insc.id !== id));
      alert('Reserva eliminada exitosamente');
    } catch (error) {
      console.error('Error al eliminar inscripción:', error);
      alert('Error al eliminar la reserva. Por favor, intenta de nuevo.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Nombre', 'Documento', 'Email', 'Teléfono', 'Actividad', 'Ubicación', 'Hora Actividad', 'Fecha Reserva', 'Fecha Inscripción', 'Hora Inscripción', 'Estado'];
    const rows = sortedInscriptions.map(insc => [
      insc.id,
      insc.nombre,
      insc.documento,
      insc.email,
      insc.telefono,
      insc.curso,
      insc.ubicacion,
      insc.horaActividad,
      insc.fechaReserva,
      insc.fecha.toLocaleDateString('es-ES'),
      insc.fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
      insc.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `inscripciones_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
              title="Volver"
            >
              <ArrowLeft size={24} className="text-gray-700" />
            </button>
          )}
        </div>
      </div>

      {/* Estadísticas y Filtros en una fila */}
      <div className="header-controls">
        <div className="stats-inline">
          <div className="stat-icon stat-icon-primary">
            <Users size={24} />
          </div>
          <p className="stat-value">Total de Inscripciones: {stats.total}</p>
        </div>

        <div className="filters-inline">
          <select 
            value={filterCourse} 
            onChange={(e) => setFilterCourse(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los Cursos</option>
            {courses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          <button 
            onClick={handleExportCSV}
            className="admin-btn-primary flex items-center gap-2"
          >
            <Download size={20} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabla de Inscripciones */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')}>ID</th>
              <th onClick={() => handleSort('nombre')}>Nombre</th>
              <th onClick={() => handleSort('documento')}>Documento</th>
              <th onClick={() => handleSort('email')}>Email</th>
              <th onClick={() => handleSort('telefono')}>Teléfono</th>
              <th onClick={() => handleSort('curso')}>Actividad</th>
              <th>Ubicación</th>
              <th>Hora Actividad</th>
              <th>Fecha Reserva</th>
              <th>Fecha Inscripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedInscriptions.length > 0 ? (
              paginatedInscriptions.map(insc => (
                <tr key={insc.id}>
                  <td className="font-medium">#{insc.id}</td>
                  <td className="font-medium text-gray-900">{insc.nombre}</td>
                  <td className="font-mono text-sm text-gray-600">{insc.documento}</td>
                  <td className="text-gray-600 text-sm">{insc.email}</td>
                  <td className="text-gray-600 text-sm">{insc.telefono}</td>
                  <td>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium whitespace-nowrap">
                      {insc.curso}
                    </span>
                  </td>
                  <td className="text-sm text-gray-600 font-medium text-center">
                    {insc.ubicacion}
                  </td>
                  <td className="text-sm text-gray-600 font-medium text-center">
                    {insc.horaActividad}
                  </td>
                  <td className="text-sm text-gray-600 text-center">
                    {insc.fechaReserva}
                  </td>
                  <td className="text-sm text-gray-600">
                    {insc.fecha.toLocaleDateString('es-ES')} {insc.fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => handleDeleteReserva(insc.id, insc.nombre)}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-medium"
                      title="Eliminar reserva"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="text-center py-8 text-gray-500">
                  No hay inscripciones que coincidan con los filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {sortedInscriptions.length > 0 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Mostrando {startIndex + 1} - {Math.min(endIndex, sortedInscriptions.length)} de {sortedInscriptions.length} registros
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ← Anterior
            </button>
            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
