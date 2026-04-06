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
  X
} from 'lucide-react';

const AdminPanel = ({ onBack }) => {
  // Estado para inscripciones (se conectará a API)
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });

  // Simulación de datos
  useEffect(() => {
    const mockInscriptions = [
      {
        id: 1,
        nombre: 'james',
        email: 'james@gmail.com',
        telefono: '123',
        curso: 'Aliméntate',
        sesion: 'Martes 14 Abr. - 8:30 a.m.',
        fecha: new Date('2025-04-01'),
        ubicacion: 'Sala 1'
      }
    ];
    
    setInscriptions(mockInscriptions);
    setLoading(false);
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

  const handleExportCSV = () => {
    const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Curso', 'Sesión', 'Estado', 'Ubicación'];
    const rows = sortedInscriptions.map(insc => [
      insc.id,
      insc.nombre,
      insc.email,
      insc.telefono,
      insc.curso,
      insc.sesion,
      insc.status,
      insc.ubicacion
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

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary">
            <Users size={24} />
          </div>
          <div>
            <p className="stat-value">Total de Inscripciones: {stats.total}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-group">
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

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los Estados</option>
            <option value="confirmado">Confirmado</option>
            <option value="pendiente">Pendiente</option>
            <option value="cancelado">Cancelado</option>
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
              <th onClick={() => handleSort('email')}>Email</th>
              <th onClick={() => handleSort('telefono')}>Teléfono</th>
              <th onClick={() => handleSort('curso')}>Curso</th>
              <th onClick={() => handleSort('sesion')}>Sesión</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedInscriptions.length > 0 ? (
              sortedInscriptions.map(insc => (
                <tr key={insc.id}>
                  <td className="font-medium">#{insc.id}</td>
                  <td className="font-medium text-gray-900">{insc.nombre}</td>
                  <td className="text-gray-600">{insc.email}</td>
                  <td className="text-gray-600">{insc.telefono}</td>
                  <td>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {insc.curso}
                    </span>
                  </td>
                  <td className="text-sm text-gray-600">{insc.sesion}</td>
                  <td>
                    <button className="action-btn" title="Ver detalles">
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  No hay inscripciones que coincidan con los filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;
