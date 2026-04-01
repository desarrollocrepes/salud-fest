# Guía de Integración - Panel Admin API

## 🔗 Cómo Conectar el Backend

### Paso 1: Actualizar el useEffect en AdminPanel.jsx

**Versión Actual (Mock):**
```javascript
useEffect(() => {
  // TODO: Reemplazar con llamada real a API
  const mockInscriptions = [...]
  setInscriptions(mockInscriptions);
  setLoading(false);
}, []);
```

**Versión con API Real:**
```javascript
useEffect(() => {
  const fetchInscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inscriptions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transformar datos si es necesario
      const inscriptionsData = data.data || data;
      setInscriptions(inscriptionsData);
      
    } catch (error) {
      console.error('Error al cargar inscripciones:', error);
      // TODO: Mostrar mensaje de error al usuario
      setInscriptions([]);
    } finally {
      setLoading(false);
    }
  };
  
  fetchInscriptions();
}, []);
```

### Paso 2: Crear un Servicio de API

**Archivo: `src/services/inscriptionsService.js`**

```javascript
// src/services/inscriptionsService.js

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const inscriptionsService = {
  
  // Obtener todas las inscripciones
  async getAll(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.curso) queryParams.append('curso', filters.curso);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.search) queryParams.append('search', filters.search);
    
    const response = await fetch(
      `${API_BASE_URL}/api/inscriptions?${queryParams}`,
      {
        headers: this._getHeaders()
      }
    );
    
    return this._handleResponse(response);
  },
  
  // Obtener inscripción por ID
  async getById(id) {
    const response = await fetch(
      `${API_BASE_URL}/api/inscriptions/${id}`,
      { headers: this._getHeaders() }
    );
    
    return this._handleResponse(response);
  },
  
  // Actualizar estado de inscripción
  async updateStatus(id, status) {
    const response = await fetch(
      `${API_BASE_URL}/api/inscriptions/${id}/status`,
      {
        method: 'PATCH',
        headers: this._getHeaders(),
        body: JSON.stringify({ status })
      }
    );
    
    return this._handleResponse(response);
  },
  
  // Cancelar inscripción
  async cancel(id) {
    return this.updateStatus(id, 'cancelado');
  },
  
  // Confirmar inscripción
  async confirm(id) {
    return this.updateStatus(id, 'confirmado');
  },
  
  // Enviar confirmación por email
  async sendConfirmationEmail(id) {
    const response = await fetch(
      `${API_BASE_URL}/api/inscriptions/${id}/send-confirmation`,
      {
        method: 'POST',
        headers: this._getHeaders()
      }
    );
    
    return this._handleResponse(response);
  },
  
  // Obtener estadísticas
  async getStatistics() {
    const response = await fetch(
      `${API_BASE_URL}/api/inscriptions/statistics`,
      { headers: this._getHeaders() }
    );
    
    return this._handleResponse(response);
  },
  
  // Funciones auxiliares privadas
  _getHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  },
  
  async _handleResponse(response) {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Error: ${response.status}`);
    }
    return response.json();
  }
};
```

### Paso 3: Usar el Servicio en AdminPanel.jsx

```javascript
import { inscriptionsService } from '../services/inscriptionsService';

useEffect(() => {
  const fetchInscriptions = async () => {
    try {
      setLoading(true);
      const data = await inscriptionsService.getAll();
      setInscriptions(data);
    } catch (error) {
      console.error('Error:', error);
      // Mostrar error al usuario
    } finally {
      setLoading(false);
    }
  };
  
  fetchInscriptions();
}, []);
```

## 📡 APIs Esperadas del Backend

### 1. **GET /api/inscriptions**
Obtiene todas las inscripciones

**Query Parameters:**
```
?curso=Aliméntate
?status=confirmado
?search=juan
?limit=50&offset=0  (para paginación)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "telefono": "3001234567",
      "curso": "Aliméntate",
      "sesion": "Martes 14 Abr. - 8:30 a.m.",
      "status": "confirmado",
      "fecha": "2025-04-01T10:30:00Z",
      "ubicacion": "Sala 1"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

### 2. **GET /api/inscriptions/:id**
Obtiene detalles de una inscripción

**Response:**
```json
{
  "success": true,
  "data": { /* objeto inscripción completo */ }
}
```

### 3. **PATCH /api/inscriptions/:id/status**
Actualiza el estado de inscripción

**Body:**
```json
{
  "status": "confirmado"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inscripción actualizada",
  "data": { /* objeto inscripción actualizado */ }
}
```

### 4. **GET /api/inscriptions/statistics**
Obtiene estadísticas generales

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "confirmados": 75,
    "pendientes": 15,
    "cancelados": 10,
    "por_curso": {
      "Aliméntate": 25,
      "Sonrisas Sanas": 35,
      "Obsérvate": 40
    }
  }
}
```

## 🔐 Autenticación

### Flujo de Login para Admin (Recomendado)

```javascript
// src/services/authService.js

export const authService = {
  async login(email, password) {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }
    );
    
    const data = await response.json();
    
    if (data.token) {
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
    }
    
    return data;
  },
  
  logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  },
  
  isAuthenticated() {
    return !!localStorage.getItem('adminToken');
  }
};
```

### Ruta Protegida

```javascript
// src/components/ProtectedRoute.jsx

import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

function ProtectedRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default ProtectedRoute;
```

```javascript
// Usar en App.jsx
<Route 
  path="/admin" 
  element={
    <ProtectedRoute>
      <AdminPanel />
    </ProtectedRoute>
  } 
/>
```

## 🧪 Testing Endpoints

### Con cURL

```bash
# Obtener inscripciones
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/inscriptions

# Actualizar estado
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmado"}' \
  http://localhost:3000/api/inscriptions/1/status
```

### Con Postman

1. Configura base URL: `http://localhost:3000`
2. Autentica obteniendo token
3. Agrega header: `Authorization: Bearer {token}`
4. Prueba endpoints

## 📦 Variables de Entorno

**Archivo: `.env.local`**
```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_API_TIMEOUT=5000
```

**Archivo: `.env.production`**
```
REACT_APP_API_URL=https://api.salud-fest.com
REACT_APP_API_TIMEOUT=10000
```

## 🚨 Manejo de Errores

```javascript
// Hook personalizado para errores
import { useState } from 'react';

export function useApiError() {
  const [error, setError] = useState(null);
  
  const handleError = (err) => {
    const message = err.response?.data?.message || err.message || 'Error desconocido';
    setError(message);
    console.error('API Error:', message);
  };
  
  const clearError = () => setError(null);
  
  return { error, handleError, clearError };
}
```

## ⚡ Optimizaciones Sugeridas

### 1. Paginación
```javascript
const [page, setPage] = useState(1);
const [limit, setLimit] = useState(20);

const data = await inscriptionsService.getAll({
  offset: (page - 1) * limit,
  limit
});
```

### 2. Caché de Datos
```javascript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery(
  ['inscriptions'],
  () => inscriptionsService.getAll(),
  { staleTime: 5 * 60 * 1000 } // 5 minutos
);
```

### 3. Debounce en Búsqueda
```javascript
import { useMemo } from 'react';
import { debounce } from 'lodash';

const handleSearch = useMemo(
  () => debounce((term) => setSearchTerm(term), 300),
  []
);
```

## 📋 Checklist de Implementación

- [ ] Crear servicio `inscriptionsService.js`
- [ ] Implementar API endpoints en backend
- [ ] Conectar AdminPanel a servicio real
- [ ] Agregar autenticación y rutas protegidas
- [ ] Probar con datos reales
- [ ] Implementar manejo de errores
- [ ] Agregar notificaciones (toast/alerts)
- [ ] Optimizar con paginación
- [ ] Implementar polling o WebSocket para datos en tiempo real
- [ ] Testing de endpoints

---

**Próximo Paso:** Implement the backend API endpoints following this specification.
