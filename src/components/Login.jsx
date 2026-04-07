import React, { useState } from 'react';
import './Login.css';
import { AlertCircle, Loader } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [cc, setCc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!cc.trim()) {
      setError('Por favor ingresa tu número de identificación');
      return;
    }

    setIsLoading(true);

    try {
      // Intentar obtener solo el empleado específico con filtro en la URL
      const apiUrl = `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${cc.trim()}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error('Error al conectar con el servidor');
      }

      const data = await response.json();
      
      // Manejar respuesta - puede venir como array o objeto directo
      let empleado = null;
      
      if (Array.isArray(data)) {
        empleado = data[0] || null;
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Si es objeto, revisar si tiene un array dentro
        if (data.data && Array.isArray(data.data)) {
          empleado = data.data[0] || null;
        } else if (data.document_number) {
          // Es el empleado directo
          empleado = data;
        }
      }

      if (!empleado || !empleado.document_number) {
        setError('Identificación no encontrada en nuestros registros');
        setIsLoading(false);
        return;
      }

      // Validar que esté activo
      const esActivo = empleado.status?.toLowerCase() === 'activo' || 
                       empleado.activo === true || 
                       empleado.activo === 'true' ||
                       empleado.estado?.toLowerCase() === 'activo';

      if (!esActivo) {
        setError('Tu usuario no está activo. Contacta con administración');
        setIsLoading(false);
        return;
      }

      // Login exitoso
      const usuarioData = {
        id: empleado.id,
        document_number: empleado.document_number,
        nombre: empleado.nombre || 'Usuario',
        correo: empleado.correo || '',
        cargo: empleado.cargo || '',
        telefono: empleado.telefono || empleado.phone || '',
        foto: empleado.foto || empleado.image || empleado.avatar || '',
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('usuario', JSON.stringify(usuarioData));
      onLoginSuccess(usuarioData);
    } catch (err) {
      setError(err.message || 'Error al validar la identificación. Intenta nuevamente.');
      console.error('Error durante login:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/sf.jpeg" alt="Salud Fest Logo" className="login-logo" width="50%" height="50%" />
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="cc" className="form-label">
              Número de Identificación (CC)
            </label>
            <input
              id="cc"
              type="text"
              inputMode="numeric"
              value={cc}
              onChange={(e) => {
                setCc(e.target.value);
                setError('');
              }}
              placeholder="Ej: 1234567890"
              className="form-input"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading || !cc.trim()}
          >
            {isLoading ? (
              <>
                <span>Verificando...</span>
              </>
            ) : (
              <span>Ingresar</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
